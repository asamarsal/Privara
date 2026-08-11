import React from 'react';
import { useRouter } from 'next/router';
import { useActivity } from '../../hooks/useActivity';
import { formatEther } from 'viem';
import { LottieLoader } from '../common/LottieLoader';
import { deployment } from '../../config/deployment';

export const HistoryTable: React.FC = () => {
  const router = useRouter();
  const { settlements, isLoading } = useActivity();

  return (
    <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Trade History</h3>
        <span onClick={() => router.push('/activity')} style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>View All</span>
      </div>
      
      <div style={{ padding: '20px', overflowX: 'auto' }}>
        {isLoading ? (
          <LottieLoader size={70} text="Loading trade history..." />
        ) : settlements.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px', padding: '20px 0' }}>
            No trade history available yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10px', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th className="hide-on-mobile" style={{ padding: '0 8px 12px', fontWeight: 600 }}>Match ID</th>
                <th style={{ padding: '0 8px 12px', fontWeight: 600 }}>Action</th>
                <th style={{ padding: '0 8px 12px', fontWeight: 600 }}>Pair</th>
                <th style={{ padding: '0 8px 12px', fontWeight: 600 }}>Price</th>
                <th className="hide-on-mobile" style={{ padding: '0 8px 12px', fontWeight: 600 }}>Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((settlement, i) => (
                <tr key={i} style={{ borderBottom: i === settlements.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="hide-on-mobile" style={{ padding: '12px 8px', fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                    {settlement.matchId.slice(0, 8)}...
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)', background: 'rgba(168,85,247,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      Settled
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--color-text-primary)' }}>FXRP / USDT0</td>
                  <td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>
                    {Number(formatEther(settlement.executionPrice)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </td>
                  <td className="hide-on-mobile" style={{ padding: '12px 8px' }}>
                    <a href={`${deployment.explorerUrl}/tx/${settlement.txHash}`} target="_blank" rel="noreferrer" style={{ color: '#00b4d8', textDecoration: 'none' }}>
                      {settlement.txHash.slice(0, 6)}...
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
