import React from 'react';
import Link from 'next/link';
import { useActivity } from '../../hooks/useActivity';
import { formatEther } from 'viem';
import { LottieLoader } from '../common/LottieLoader';

export const ActivityFeed: React.FC = () => {
  const { orders, isLoading } = useActivity();

  return (
    <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', padding: '20px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Recent Activity</h3>
        <Link href="/activity" style={{ color: 'var(--color-accent-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>View All</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
        {/* Timeline connector */}
        {orders.length > 0 && <div style={{ position: 'absolute', left: '11px', top: '20px', bottom: '20px', width: '1px', background: 'var(--color-border)', zIndex: 0 }} />}

        {isLoading ? (
          <LottieLoader size={60} text="Loading activities..." />
        ) : orders.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>No recent activities.</div>
        ) : (
          orders.slice(0, 4).map((act, i) => {
            const isBuy = act.side === 0;
            const tokenSymbol = act.tokenIn === '0x12967a98792fc53Fb39E91d9B69917B5D32fb011' ? 'FXRP' : 'USDT0';
            const amountStr = Number(formatEther(act.amountIn)).toLocaleString(undefined, { maximumFractionDigits: 2 });
            const color = isBuy ? 'var(--color-success)' : 'var(--color-error)';
            
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-bg-surface)', border: `1px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                  {isBuy ? 'B' : 'S'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Order Placed</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{isBuy ? 'Buy' : 'Sell'} {amountStr} {tokenSymbol}</div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Block {act.blockNumber}</div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
        <Link href="/activity" style={{ color: 'var(--color-text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', textDecoration: 'none' }}>
          View all activity <span>›</span>
        </Link>
      </div>
    </div>
  );
};
