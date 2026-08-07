import React, { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { TransactionState } from './TransactionState';
import { parseAbi, parseEther, formatEther } from 'viem';
import { useNetwork } from '../hooks/useNetwork';
import { useVaultBalance } from '../hooks/useVaultBalance';

const vaultAbi = parseAbi([
  'function withdraw(address token, uint256 amount)'
]);

export const WithdrawalForm: React.FC = () => {
  const { isCorrectNetwork } = useNetwork();
  const { fxrpBalance, usdt0Balance, refetch } = useVaultBalance();
  const [token, setToken] = useState<'FXRP' | 'USDT0'>('FXRP');
  const [amountStr, setAmountStr] = useState('');
  const [error, setError] = useState('');

  const vaultAddress = "0xa479Bc0C4B000D0dcD6FaC3BB9E71B830eBE048E";
  const fxrpAddress = "0x12967a98792fc53Fb39E91d9B69917B5D32fb011";
  const usdt0Address = "0xDC7E830282489f5e461C4bfC0deE292fD9591C86";

  const tokenAddress = token === 'FXRP' ? fxrpAddress : usdt0Address;
  const vaultTokenBalance = token === 'FXRP' ? fxrpBalance : usdt0Balance;

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
      if (vaultTokenBalance && parsed > vaultTokenBalance) {
        setError('Amount exceeds vault balance');
        return null;
      }
      return parsed;
    } catch (err) {
      setError('Invalid amount');
      return null;
    }
  };

  const handleMax = () => {
    if (vaultTokenBalance) {
      setAmountStr(formatEther(vaultTokenBalance));
    }
  };

  const handleWithdraw = async () => {
    const parsedAmount = validateInput(amountStr);
    if (!parsedAmount) return;

    try {
      setTxState('awaiting_approval');
      setTxError('');
      setTxHash(undefined);

      const withdrawHash = await writeWithdraw({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'withdraw',
        args: [tokenAddress, parsedAmount]
      });

      setTxHash(withdrawHash);
      setTxState('pending');

      // Simulating wait for MVP
      setTxState('success');
      refetch();
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

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        <span>Vault Balance</span>
        <span>{vaultTokenBalance ? formatEther(vaultTokenBalance) : '0.0'} {token}</span>
      </div>

      <div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            type="text"
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
        disabled={!amountStr || !!error || !isCorrectNetwork || txState === 'awaiting_approval' || txState === 'pending' || !vaultTokenBalance || vaultTokenBalance === 0n}
      >
        Withdraw {token}
      </button>

      <TransactionState state={txState} txHash={txHash} errorMessage={txError} />
    </div>
  );
};
