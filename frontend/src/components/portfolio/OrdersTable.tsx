import React from 'react';
import { useRouter } from 'next/router';
import { useActivity, OrderHistoryItem } from '../../hooks/useActivity';
import { useOrderStatus } from '../../hooks/useOrderStatus';
import { formatEther } from 'viem';
import { LottieLoader, MiniLottieSpinner } from '../common/LottieLoader';

// Sub-component to handle individual order rows and their dynamic status
const OrderRow: React.FC<{ order: OrderHistoryItem; isLast?: boolean }> = ({ order, isLast }) => {
  const { status, isLoading } = useOrderStatus(order.orderId, order.expiry);
  
  const sideLabel = order.side === 0 ? 'Buy' : 'Sell';
  const pairLabel = 'FXRP / USDT0';
  const amountToken = order.side === 0 ? 'USDT0' : 'FXRP';
  
  // Format amount (assume 18 decimals)
  const amountStr = `${Number(formatEther(order.amountIn)).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${amountToken}`;

  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <td className="hide-on-mobile" style={{ padding: '12px 8px', fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
        {order.orderId.slice(0, 10)}...
      </td>
      <td style={{ padding: '12px 8px' }}>
        <span style={{ 
          color: sideLabel === 'Buy' ? 'var(--color-success)' : 'var(--color-error)', 
          border: `1px solid ${sideLabel === 'Buy' ? 'rgba(0,255,136,0.2)' : 'rgba(255,85,85,0.2)'}`, 
          background: sideLabel === 'Buy' ? 'rgba(0,255,136,0.05)' : 'rgba(255,85,85,0.05)', 
          padding: '2px 6px', 
          borderRadius: '4px', 
          fontSize: '11px', 
          fontWeight: 600 
        }}>
          {sideLabel}
        </span>
      </td>
      <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{pairLabel}</td>
      <td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>{amountStr}</td>
      <td className="hide-on-mobile" style={{ padding: '12px 8px', fontFamily: 'monospace' }}>Committed bound</td>
      <td style={{ padding: '12px 8px' }}>
        {isLoading ? (
          <MiniLottieSpinner size={20} />
        ) : (
          <span style={{ 
            color: status === 'open' ? '#00e7df' : status === 'matched' || status === 'settled' ? '#a855f7' : 'var(--color-text-muted)',
            border: `1px solid ${status === 'open' ? 'rgba(0,231,223,0.2)' : status === 'matched' || status === 'settled' ? 'rgba(168,85,247,0.2)' : 'var(--color-border)'}`,
            padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
            textTransform: 'capitalize'
          }}>
            {status}
          </span>
        )}
      </td>
    </tr>
  );
};

export const OrdersTable: React.FC = () => {
  const router = useRouter();
  const { orders, isLoading } = useActivity();

  return (
    <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Active Orders</h3>
        <span onClick={() => router.push('/activity')} style={{ color: 'var(--color-accent-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>View All</span>
      </div>
      
      <div style={{ padding: '20px', overflowX: 'auto' }}>
        {isLoading ? (
          <LottieLoader size={70} text="Loading active orders..." />
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px', padding: '20px 0' }}>
            No active orders.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10px', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th className="hide-on-mobile" style={{ padding: '0 8px 12px', fontWeight: 600 }}>Order ID</th>
                <th style={{ padding: '0 8px 12px', fontWeight: 600 }}>Side</th>
                <th style={{ padding: '0 8px 12px', fontWeight: 600 }}>Pair</th>
                <th style={{ padding: '0 8px 12px', fontWeight: 600 }}>Amount</th>
                <th className="hide-on-mobile" style={{ padding: '0 8px 12px', fontWeight: 600 }}>Price</th>
                <th style={{ padding: '0 8px 12px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <OrderRow key={order.orderId} order={order} isLast={i === orders.length - 1} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
