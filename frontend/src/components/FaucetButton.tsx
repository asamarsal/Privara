import React, { useState } from 'react';
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { formatEther, parseAbi } from 'viem';
import { useNetwork } from '../hooks/useNetwork';
import { deployment, isAuditedV2Deployment } from '../config/deployment';

const tokenAbi = parseAbi([
  'function claim() external',
  'function hasClaimed(address account) view returns (bool)',
  'function faucetAmount() view returns (uint256)'
]);
const TOKENS = [
  { symbol: 'FXRP', address: deployment.fxrp },
  { symbol: 'USDT0', address: deployment.usdt0 },
] as const;

interface ToastState { title: string; message: string; type: 'success' | 'error'; txHash?: string }

export const FaucetButton: React.FC = () => {
  const { address } = useAccount();
  const { isCorrectNetwork } = useNetwork();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<(typeof TOKENS)[number]['address']>(TOKENS[0].address);
  const [toast, setToast] = useState<ToastState | null>(null);
  const selected = TOKENS.find(item => item.address === selectedToken) ?? TOKENS[0];
  const { data: faucetData, isLoading: faucetLoading, refetch: refetchFaucet } = useReadContracts({
    contracts: [
      { address: selected.address, abi: tokenAbi, functionName: 'hasClaimed', args: [address as `0x${string}`] },
      { address: selected.address, abi: tokenAbi, functionName: 'faucetAmount' },
    ],
    query: { enabled: !!address }
  });
  const hasClaimed = faucetData?.[0].result as boolean | undefined;
  const faucetAmount = faucetData?.[1].result as bigint | undefined;

  const showToast = (title: string, message: string, type: 'success' | 'error', txHash?: string) => {
    setToast({ title, message, type, txHash });
    setTimeout(() => setToast(null), 8000);
  };

  const handleClaim = async () => {
    if (!address || !publicClient || !isCorrectNetwork || !isAuditedV2Deployment || hasClaimed) return;
    try {
      setLoading(true);
      const token = TOKENS.find(item => item.address === selectedToken) ?? TOKENS[0];
      const hash = await writeContractAsync({ address: token.address, abi: tokenAbi, functionName: 'claim', chainId: deployment.chainId });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('Faucet claim reverted');
      showToast('Faucet Confirmed', `One-time ${token.symbol} demo allocation received.`, 'success', hash);
      await refetchFaucet();
      await queryClient.invalidateQueries({ queryKey: ['readContract'] });
      setIsOpen(false);
    } catch (error: any) {
      showToast('Claim Failed', error.shortMessage || error.message || 'Faucet claim failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!address || !isCorrectNetwork || !isAuditedV2Deployment) return null;

  return (
    <div style={{ position: 'relative', height: '36px' }}>
      <button onClick={() => setIsOpen(!isOpen)} disabled={loading} className={loading ? 'btn-premium-secondary' : 'btn-premium-primary'} style={{ padding: '0 1rem', fontSize: '14px', height: '36px' }}>
        {loading ? 'Claiming...' : 'Claim Demo Tokens'}
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-dropdown)', borderRadius: '12px', padding: '24px', width: '320px', zIndex: 1000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <strong>One-time Coston2 Demo Faucet</strong>
            <button onClick={() => setIsOpen(false)} aria-label="Close faucet" style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }}>×</button>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Mock test assets only. Not production-backed FXRP or USDT.</p>
          <label htmlFor="faucet-token" style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Demo token</label>
          <select id="faucet-token" value={selectedToken} onChange={event => setSelectedToken(event.target.value as typeof selectedToken)} style={{ width: '100%', padding: '10px', marginBottom: '12px' }}>
            {TOKENS.map(token => <option key={token.address} value={token.address}>{token.symbol}</option>)}
          </select>
          <p aria-live="polite" style={{ fontSize: '12px' }}>{faucetLoading ? 'Checking eligibility…' : hasClaimed ? `You have already claimed ${selected.symbol}.` : `Available: ${formatEther(faucetAmount ?? 0n)} ${selected.symbol}`}</p>
          <button onClick={handleClaim} disabled={loading || faucetLoading || !!hasClaimed} className="btn-premium-primary" style={{ width: '100%', padding: '10px' }}>{hasClaimed ? 'Already Claimed' : 'Claim Once'}</button>
        </div>
      )}
      {toast && (
        <div style={{ position: 'fixed', right: '24px', bottom: '24px', zIndex: 2000, padding: '14px', borderRadius: '8px', background: toast.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-error-bg)' }}>
          <strong>{toast.title}</strong><div>{toast.message}</div>
          {toast.txHash && <a href={`${deployment.explorerUrl}/tx/${toast.txHash}`} target="_blank" rel="noreferrer">View transaction</a>}
        </div>
      )}
    </div>
  );
};
