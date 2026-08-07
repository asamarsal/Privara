import React, { useMemo } from 'react';
import { useActivity } from '../../hooks/useActivity';
import { formatEther } from 'viem';

// Mini bar chart using CSS
function MiniBarChart() {
  const bars = [40, 60, 35, 75, 50, 85, 65, 90, 70, 95];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '36px' }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          width: '6px',
          height: `${h}%`,
          borderRadius: '2px',
          background: i === bars.length - 1 ? 'var(--color-accent-primary)' : 'rgba(0,231,223,0.35)',
          transition: 'height 0.3s ease'
        }} />
      ))}
    </div>
  );
}

function StatRow({ label, value, change, changeUp }: { label: string; value: string; change?: string; changeUp?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{value}</span>
        {change && (
          <span style={{ fontSize: '11px', fontWeight: 700, color: changeUp ? '#22c55e' : '#f97316' }}>
            {changeUp ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
    </div>
  );
}

export const ActivitySummaryCard: React.FC = () => {
  const { orders, settlements, isLoading } = useActivity();

  const stats = useMemo(() => {
    const settled = settlements.length;
    const matched = settlements.length; // settlements imply matched
    const totalFxrpVolume = settlements.reduce((acc, s) => acc + Number(formatEther(s.fxrpAmount)), 0);
    const totalVolumeUsd = totalFxrpVolume * 0.25;

    return {
      totalVolumeUsd: totalVolumeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      settled,
      matched,
      activeOrders: orders.length,
    };
  }, [orders, settlements]);

  return (
    <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="8" width="3" height="7" rx="1" fill="#00e7df"/>
          <rect x="6" y="5" width="3" height="10" rx="1" fill="#00e7df" opacity="0.7"/>
          <rect x="11" y="2" width="3" height="13" rx="1" fill="#00e7df" opacity="0.5"/>
        </svg>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Today's Summary</h3>
      </div>

      {/* Total Volume + Chart */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Volume</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
            ${isLoading ? '—' : stats.totalVolumeUsd}
          </div>
        </div>
        <MiniBarChart />
      </div>

      {/* Stats */}
      <div>
        <StatRow label="Active Orders" value={String(stats.activeOrders)} />
        <StatRow label="Trades Settled" value={String(stats.settled)} change={stats.settled > 0 ? "41.2%" : undefined} changeUp />
        <StatRow label="Matches Found" value={String(stats.matched)} change={stats.matched > 0 ? "33.3%" : undefined} changeUp />
      </div>
    </div>
  );
};
