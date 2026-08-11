import React from 'react';
import { useActivity } from '../../hooks/useActivity';
import { formatEther } from 'viem';
import { LottieLoader } from '../common/LottieLoader';
import { deployment } from '../../config/deployment';

const EXPLORER = deployment.explorerUrl;

function DetailRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{label}</span>
      {isLink ? (
        <a href={`${EXPLORER}/search?q=${value}`} target="_blank" rel="noreferrer"
          style={{ color: '#00b4d8', textDecoration: 'none', fontSize: '12px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {value.slice(0, 8)}…{value.slice(-4)}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 8L8 2M8 2H4M8 2v4" stroke="#00b4d8" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </a>
      ) : (
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{value}</span>
      )}
    </div>
  );
}

export const LatestSettlementCard: React.FC = () => {
  const { settlements, isLoading } = useActivity();
  const latest = settlements[0];

  return (
    <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="#22c55e" strokeWidth="1.5"/>
          <path d="M5 8l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Latest Settlement</h3>
      </div>

      {isLoading ? (
        <LottieLoader size={50} text="Loading..." />
      ) : !latest ? (
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0' }}>
          No settlements yet.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '12px' }}>
            <DetailRow label="Match ID" value={latest.matchId} isLink />
            <DetailRow label="Pair" value="FXRP / USDT0" />
            <DetailRow
              label="Amount"
              value={`${Number(formatEther(latest.fxrpAmount)).toLocaleString(undefined, { maximumFractionDigits: 2 })} FXRP`}
            />
            <DetailRow
              label="Execution Price"
              value={`${Number(formatEther(latest.executionPrice)).toLocaleString(undefined, { maximumFractionDigits: 4 })} USDT0`}
            />
            <DetailRow label="FTSOv2 Price" value="—" />
          </div>

          <a href={`${EXPLORER}/tx/${latest.txHash}`} target="_blank" rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px', border: '1px solid var(--color-border)', borderRadius: '10px',
              color: 'var(--color-text-primary)', textDecoration: 'none', fontSize: '13px', fontWeight: 600,
              background: 'rgba(255,255,255,0.04)', transition: 'background 0.15s'
            }}>
            View on Explorer
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </a>
        </>
      )}
    </div>
  );
};
