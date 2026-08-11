import { useState } from 'react';
import { useAccount, usePublicClient, useSignMessage, useWriteContract } from 'wagmi';
import { parseAbi, parseEther } from 'viem';
import { hashOrder, Order, OrderSide, OrderType, orderToWire } from '@privara/shared';
import { deployment, isAuditedV2Deployment } from '../config/deployment';
import { createNonce, createOrderId, submitOrderPayload } from '../utils/orderSubmission';
import { orderErrorMessage } from '../utils/tokenFormatting';
import { saveOrderToHistory } from './useActivity';
import { useNetwork } from './useNetwork';
import { useVaultBalance } from './useVaultBalance';

const vaultAbi = parseAbi(['function commitOrder(bytes32 orderId, uint8 side, address tokenIn, uint256 amountIn, bytes32 encryptedCommitment, uint64 expiry)']);
export type ClassicSide = 'buy' | 'sell';

export function useClassicOrderSubmission() {
  const { address, isConnected } = useAccount();
  const { isCorrectNetwork } = useNetwork();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const balances = useVaultBalance();
  const [txState, setTxState] = useState<'idle' | 'awaiting_approval' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>();
  const [txError, setTxError] = useState('');

  const submit = async (side: ClassicSide, amountText: string, priceText: string, expiryHours: string) => {
    try {
      if (!address || !isConnected) throw new Error('Connect your wallet');
      if (!isAuditedV2Deployment) throw new Error('Writes are disabled until PrivaraVault V2 is deployed on Coston2');
      if (!isCorrectNetwork || !publicClient) throw new Error('Connect a wallet on Coston2');
      if (!amountText || !priceText || amountText.toLowerCase().includes('e') || priceText.toLowerCase().includes('e')) throw new Error('Enter valid decimal amount and limit price');
      const parsedAmount = parseEther(amountText);
      const limitPrice = parseEther(priceText);
      if (parsedAmount <= 0n || limitPrice <= 0n) throw new Error('Amount and limit price must be greater than zero');
      const amountIn = parsedAmount;
      const available = side === 'buy' ? balances.usdt0AvailableBalance : balances.fxrpAvailableBalance;
      if (available !== undefined && amountIn > available) throw new Error(`Insufficient available ${side === 'buy' ? 'USDT0' : 'FXRP'} vault balance`);

      setTxState('awaiting_approval'); setTxError(''); setTxHash(undefined);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + Number(expiryHours) * 3600);
      const orderSide = side === 'buy' ? OrderSide.buy : OrderSide.sell;
      const order: Order = {
        orderId: createOrderId(), maker: address, side: orderSide,
        tokenIn: (side === 'buy' ? deployment.usdt0 : deployment.fxrp) as `0x${string}`,
        tokenOut: (side === 'buy' ? deployment.fxrp : deployment.usdt0) as `0x${string}`,
        amountIn, limitPrice, orderType: OrderType.limit, stopPrice: 0n,
        expiry: Number(expiry), nonce: createNonce(), chainId: 114, vaultAddress: deployment.vault,
      };
      const payload = JSON.stringify(orderToWire(order));
      const signature = await signMessageAsync({ message: payload });
      const hash = await writeContractAsync({ address: deployment.vault as `0x${string}`, abi: vaultAbi, functionName: 'commitOrder', args: [order.orderId as `0x${string}`, side === 'buy' ? 0 : 1, order.tokenIn as `0x${string}`, amountIn, hashOrder(order) as `0x${string}`, expiry], chainId: 114 });
      setTxHash(hash); setTxState('pending');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('Order commitment reverted');
      try { await submitOrderPayload(order, address, signature); }
      catch (error) { throw new Error(`Order commitment is mined (${hash}), but matcher registration failed. Keep this transaction hash and retry the backend or cancel the order. ${orderErrorMessage(error)}`); }
      saveOrderToHistory({ orderId: order.orderId, side: side === 'buy' ? 0 : 1, tokenIn: order.tokenIn, amountIn, expiry: Number(expiry), txHash: hash, timestamp: Date.now(), status: 'pending' });
      setTxState('success'); await balances.refetch();
      return true;
    } catch (error) { setTxState('error'); setTxError(orderErrorMessage(error)); return false; }
  };
  return { ...balances, submit, txState, txHash, txError };
}
