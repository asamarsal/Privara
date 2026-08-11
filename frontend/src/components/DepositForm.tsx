import React, { useEffect, useState } from 'react';
import { useAccount, useWriteContract, useReadContracts, usePublicClient } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useVaultBalance } from '../hooks/useVaultBalance';
import { TransactionState } from './TransactionState';
import { parseAbi, parseEther, formatEther } from 'viem';
import { useNetwork } from '../hooks/useNetwork';
import { deployment, isAuditedV2Deployment } from '../config/deployment';

const erc20Abi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
]);

const vaultAbi = parseAbi([
  'function deposit(address token, uint256 amount)'
]);

export const DepositForm: React.FC<{ initialToken?: 'FXRP' | 'USDT0' }> = ({ initialToken = 'FXRP' }) => {
  const { address } = useAccount();
  const { isCorrectNetwork } = useNetwork();
  const [token, setToken] = useState<'FXRP' | 'USDT0'>(initialToken);
  useEffect(() => setToken(initialToken), [initialToken]);
  const [amountStr, setAmountStr] = useState('');
  const [error, setError] = useState('');

  const { vault: vaultAddress, fxrp: fxrpAddress, usdt0: usdt0Address } = deployment;

  const tokenAddress = token === 'FXRP' ? fxrpAddress : usdt0Address;

  // Read balance and allowance
  const { data: contractData, refetch } = useReadContracts({
    contracts: [
      { address: tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [address as `0x${string}`] },
      { address: tokenAddress, abi: erc20Abi, functionName: 'allowance', args: [address as `0x${string}`, vaultAddress] }
    ],
    query: { enabled: !!address && !!tokenAddress && !!vaultAddress }
  });

  const walletBalance = contractData?.[0].result as bigint | undefined;
  const currentAllowance = contractData?.[1].result as bigint | undefined;

  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeDeposit } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { refetch: refetchVault } = useVaultBalance();

  const [txState, setTxState] = useState<'idle' | 'awaiting_approval' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>();
  const [txError, setTxError] = useState<string>();

  const validateInput = (val: string): bigint | null => {
    setError('');
    if (!val) return null;
    if (val.includes('e') || val.includes('E')) {
      setError('Scientific notation is not allowed');
      return null;
    }
    const num = Number(val);
    if (isNaN(num) || num <= 0) {
      setError('Amount must be greater than zero');
      return null;
    }

    // Check decimals (max 18)
    if (val.includes('.')) {
      const parts = val.split('.');
      if (parts[1] && parts[1].length > 18) {
        setError('Too many decimal places');
        return null;
      }
    }

    try {
      const parsed = parseEther(val);
      if (walletBalance && parsed > walletBalance) {
        setError('Amount exceeds wallet balance');
        return null;
      }
      return parsed;
    } catch (err) {
      setError('Invalid amount');
      return null;
    }
  };

  const handleMax = () => {
    if (walletBalance) {
      setAmountStr(formatEther(walletBalance));
    }
  };

  const handleDeposit = async () => {
    if (!address || !isCorrectNetwork || !publicClient) {
      setTxState('error');
      setTxError('Connect a wallet on Coston2');
      return;
    }
    const parsedAmount = validateInput(amountStr);
    if (!parsedAmount) return;

    try {
      setTxState('awaiting_approval');
      setTxError('');
      setTxHash(undefined);

      if (!isAuditedV2Deployment) throw new Error('Writes are disabled until PrivaraVault V2 is deployed on Coston2');
      // 1. Approve and wait for confirmation if necessary.
      if (currentAllowance === undefined || currentAllowance < parsedAmount) {
        const approveHash = await writeApprove({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [vaultAddress, parsedAmount],
          chainId: 114,
        });
        setTxHash(approveHash);
        setTxState('pending');
        const approval = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approval.status !== 'success') throw new Error('Token approval reverted');
        await refetch();
        await queryClient.invalidateQueries({ queryKey: ['readContract'] });
        setTxState('awaiting_approval');
      }

      // 2. Deposit and wait for the on-chain receipt.
      const depositHash = await writeDeposit({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'deposit',
        args: [tokenAddress, parsedAmount],
        chainId: 114,
      });

      setTxHash(depositHash);
      setTxState('pending');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
      if (receipt.status !== 'success') throw new Error('Deposit reverted');
      setTxState('success');
      await Promise.all([refetch(), refetchVault()]);
      await queryClient.invalidateQueries({ queryKey: ['readContract'] });
    } catch (err: any) {
      setTxState('error');
      setTxError(err.message || 'Transaction failed');
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Deposit Tokens</h3>

      <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
        <button
          className={token === 'FXRP' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setToken('FXRP'); setAmountStr(''); setError(''); }}
          style={{ flex: 1 }}
        >
          FXRP
        </button>
        <button
          className={token === 'USDT0' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setToken('USDT0'); setAmountStr(''); setError(''); }}
          style={{ flex: 1 }}
        >
          USDT0
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        <span>Wallet Balance</span>
        <span>{walletBalance ? formatEther(walletBalance) : '0.0'} {token}</span>
      </div>

      <div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <label htmlFor="deposit-amount" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Deposit amount in {token}</label>
          <input
            id="deposit-amount"
            type="text"
            inputMode="decimal"
            className="input-field"
            placeholder="0.00"
            value={amountStr}
            onChange={(e) => {
              setAmountStr(e.target.value);
              validateInput(e.target.value);
            }}
          />
          <button className="btn-secondary" onClick={handleMax}>Max</button>
        </div>
        {error && <div style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>{error}</div>}
      </div>

      <button
        className="btn-premium-buy"
        style={{ width: '100%', padding: '14px', fontSize: '15px' }}
        onClick={handleDeposit}
        disabled={!isAuditedV2Deployment || (!!address && (!amountStr || !!error)) || txState === 'awaiting_approval' || txState === 'pending'}
      >
        Deposit {token}
      </button>

      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
        Note: Deposits are visible on-chain. Wallet addresses are not private.
      </div>

      <TransactionState state={txState} txHash={txHash} errorMessage={txError} />
    </div>
  );
};
