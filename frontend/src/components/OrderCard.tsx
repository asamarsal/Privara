import React, { useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { parseAbi, formatEther } from 'viem';
import { OrderHistoryItem } from '../hooks/useActivity';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { OrderStatusBadge } from './OrderStatusBadge';
import { TransactionState } from './TransactionState';
import { deployment, isAuditedV2Deployment } from '../config/deployment';
import { useNetwork } from '../hooks/useNetwork';
import { useVaultBalance } from '../hooks/useVaultBalance';
import { orderErrorMessage } from '../utils/tokenFormatting';

const vaultAbi = parseAbi([
  'function cancelOrder(bytes32 orderId)'
]);

export const OrderCard: React.FC<{ order: OrderHistoryItem; showCancel?: boolean }> = ({ order, showCancel = true }) => {
  const { address } = useAccount();
  const { status, isLoading, refetch: refetchStatus } = useOrderStatus(order.orderId, order.expiry);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { isCorrectNetwork } = useNetwork();
  const { refetch: refetchBalances } = useVaultBalance();
  
  const [txState, setTxState] = useState<'idle' | 'awaiting_approval' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>();
  const [txError, setTxError] = useState<string>();

  const { vault: vaultAddress, explorerUrl } = deployment;

  const handleCancel = async () => {
    try {
      if (!address) throw new Error('Connect the maker wallet before cancelling');
      if (!isAuditedV2Deployment || !isCorrectNetwork || !publicClient) throw new Error('Connect the maker wallet on Coston2 V2');
      setTxState('awaiting_approval');
      setTxError('');
      setTxHash(undefined);
      
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'cancelOrder',
        args: [order.orderId as `0x${string}`],
        chainId: 114,
      });

      setTxHash(hash);
      setTxState('pending');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('Order cancellation reverted');
      setTxState('success');
      await Promise.all([refetchBalances(), refetchStatus()]);
    } catch (err: unknown) {
      setTxState('error');
      setTxError(orderErrorMessage(err));
    }
  };

  const sideLabel = order.side === 0 ? 'Buy' : 'Sell';
  const color = order.side === 0 ? 'var(--color-success)' : 'var(--color-error)';

  return (
    <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
        <div>
          <div style={{ fontWeight: 600, color, fontSize: 'var(--font-size-lg)' }}>{sideLabel} FXRP</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Amount: {formatEther(order.amountIn)}</div>
        </div>
        <div>
          {isLoading ? <span style={{ color: 'var(--color-text-muted)' }}>...</span> : <OrderStatusBadge status={status} />}
        </div>
      </div>
      
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
        ID: {order.orderId.slice(0, 10)}...{order.orderId.slice(-8)}
      </div>

      {'timestamp' in order && (order as any).timestamp && (
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
          {new Date((order as any).timestamp).toLocaleString()}
        </div>
      )}

      {'txHash' in order && order.txHash && (
        <div style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
          <a
            href={`${explorerUrl}/tx/${order.txHash}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--color-accent-primary)' }}
          >
            View on Explorer ↗
          </a>
        </div>
      )}

      {showCancel && (status === 'open' || status === 'expired') && (
        <button 
          className="btn-danger" 
          onClick={handleCancel}
          disabled={txState === 'awaiting_approval' || txState === 'pending' || txState === 'success'}
          style={{ width: '100%' }}
        >
          Cancel Order
        </button>
      )}

      <TransactionState state={txState} txHash={txHash} errorMessage={txError} />
    </div>
  );
};
