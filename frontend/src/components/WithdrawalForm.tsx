import React, { useEffect, useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { TransactionState } from './TransactionState';
import { parseAbi, parseEther, formatEther } from 'viem';
import { useNetwork } from '../hooks/useNetwork';
import { useVaultBalance } from '../hooks/useVaultBalance';
import { deployment, isAuditedV2Deployment } from '../config/deployment';
import { useQueryClient } from '@tanstack/react-query';

const vaultAbi = parseAbi([
  'function withdraw(address token, uint256 amount)'
]);

export const WithdrawalForm: React.FC<{ initialToken?: 'FXRP' | 'USDT0' }> = ({ initialToken = 'FXRP' }) => {
  const { address } = useAccount();
  const { isCorrectNetwork } = useNetwork();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const {
    fxrpBalance, usdt0Balance, fxrpLockedBalance, usdt0LockedBalance,
    fxrpAvailableBalance, usdt0AvailableBalance, isLoading, isError, refetch
  } = useVaultBalance();
  const [token, setToken] = useState<'FXRP' | 'USDT0'>(initialToken);
  useEffect(() => setToken(initialToken), [initialToken]);
  const [amountStr, setAmountStr] = useState('');
  const [error, setError] = useState('');

  const { vault: vaultAddress, fxrp: fxrpAddress, usdt0: usdt0Address } = deployment;

  const tokenAddress = token === 'FXRP' ? fxrpAddress : usdt0Address;
  const vaultTokenBalance = token === 'FXRP' ? fxrpBalance : usdt0Balance;
  const lockedBalance = token === 'FXRP' ? fxrpLockedBalance : usdt0LockedBalance;
  const availableBalance = token === 'FXRP' ? fxrpAvailableBalance : usdt0AvailableBalance;

  const { writeContractAsync: writeWithdraw } = useWriteContract();

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

    if (val.includes('.')) {
      const parts = val.split('.');
      if (parts[1] && parts[1].length > 18) {
        setError('Too many decimal places');
        return null;
      }
    }

    try {
      const parsed = parseEther(val);
      if (availableBalance !== undefined && parsed > availableBalance) {
        setError('Amount exceeds available balance');
        return null;
      }
      return parsed;
    } catch (err) {
      setError('Invalid amount');
      return null;
    }
  };

  const handleMax = () => {
    if (availableBalance !== undefined) {
      setAmountStr(formatEther(availableBalance));
    }
  };

  const handleWithdraw = async () => {
    if (!address || !isCorrectNetwork || !publicClient) {
      setTxState('error');
      setTxError('Connect a wallet on Coston2');
      return;
    }
    const parsedAmount = validateInput(amountStr);
    if (!parsedAmount) return;

    try {
      if (!isAuditedV2Deployment) throw new Error('Writes are disabled until PrivaraVault V2 is deployed on Coston2');
      setTxState('awaiting_approval');
      setTxError('');
      setTxHash(undefined);

      const withdrawHash = await writeWithdraw({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'withdraw',
        args: [tokenAddress, parsedAmount],
        chainId: 114,
      });

      setTxHash(withdrawHash);
      setTxState('pending');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
      if (receipt.status !== 'success') throw new Error('Withdrawal reverted');
      setTxState('success');
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['readContract'] });
    } catch (err: any) {
      setTxState('error');
      setTxError(err.message || 'Transaction failed');
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Withdraw Tokens</h3>

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

      <div style={{ display: 'grid', gap: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }} aria-live="polite">
        {isLoading ? <span>Loading vault balances…</span> : isError ? <span style={{ color: 'var(--color-error)' }}>Unable to load vault balances.</span> : <>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Available</span><span>{formatEther(availableBalance ?? 0n)} {token}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Locked</span><span>{formatEther(lockedBalance ?? 0n)} {token}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total</span><span>{formatEther(vaultTokenBalance ?? 0n)} {token}</span></div>
        </>}
      </div>

      <div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <label htmlFor="withdraw-amount" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Withdrawal amount in {token}</label>
          <input
            id="withdraw-amount"
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
        className="btn-premium-sell"
        style={{ width: '100%', padding: '14px', fontSize: '15px' }}
        onClick={handleWithdraw}
        disabled={!isAuditedV2Deployment || (!!address && (!amountStr || !!error || isLoading || isError || availableBalance === undefined || availableBalance === 0n)) || txState === 'awaiting_approval' || txState === 'pending'}
      >
        Withdraw {token}
      </button>

      <TransactionState state={txState} txHash={txHash} errorMessage={txError} />
    </div>
  );
};
