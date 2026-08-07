import React, { useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { LottieLoader } from './common/LottieLoader';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface OrderBookItem {
  orderId: string;
  maker: string;
  side: number; // 0 = buy, 1 = sell
  tokenIn: string;
  amountIn: string;
  expiry: number;
}

export const LiveOrderBook: React.FC = () => {
  const [bids, setBids] = useState<OrderBookItem[]>([]);
  const [asks, setAsks] = useState<OrderBookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrderBook = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/orders`);
      if (!res.ok) return;
      const allOrders: OrderBookItem[] = await res.json();

      // Separate into bids and asks
      const buyOrders = allOrders.filter(o => o.side === 0);
      const sellOrders = allOrders.filter(o => o.side === 1);

      // Sort: normally by price, but we don't have explicit price in mock orders. 
      // We will sort by amount descending for visual effect
      buyOrders.sort((a, b) => Number(BigInt(b.amountIn) - BigInt(a.amountIn)));
      sellOrders.sort((a, b) => Number(BigInt(b.amountIn) - BigInt(a.amountIn)));

      setBids(buyOrders);
      setAsks(sellOrders);
    } catch (err) {
      console.error('Failed to fetch orderbook', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 3000);
    return () => clearInterval(interval);
  }, []);

  const renderRow = (order: OrderBookItem, type: 'bid' | 'ask') => {
    const isAsk = type === 'ask';
    const color = isAsk ? 'var(--color-error)' : 'var(--color-success)';
    const bg = isAsk ? 'var(--color-error-bg)' : 'var(--color-success-bg)';

    // Random depth visualization for UI since we lack real price depth
    const depthWidth = Math.min(100, Math.max(10, (Number(formatEther(BigInt(order.amountIn))) / 100) * 100));

    return (
      <div
        key={order.orderId}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: 'var(--space-1) var(--space-2)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-mono)',
          position: 'relative',
          marginBottom: '2px',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-surface-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: `${depthWidth}%`,
          backgroundColor: bg,
          zIndex: 0,
          opacity: 0.5,
          transition: 'width 0.3s ease'
        }} />
        <span style={{ color, zIndex: 1, position: 'relative' }}>
          {formatEther(BigInt(order.amountIn))}
        </span>
        <span style={{ color: 'var(--color-text-secondary)', zIndex: 1, position: 'relative' }}>
          {order.orderId.slice(0, 8)}
        </span>
      </div>
    );
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 var(--space-4) 0', fontSize: 'var(--font-size-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
        Live Order Book
      </h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
        <span>Amount (FXRP)</span>
        <span>Order ID</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Asks (Sells) */}
        <div style={{ display: 'flex', flexDirection: 'column-reverse', flex: 1, minHeight: '150px' }}>
          {isLoading ? (
            <LottieLoader size={45} text="Loading asks..." />
          ) : asks.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', padding: 'var(--space-4)' }}>No Asks</div>
          ) : (
            asks.slice(0, 15).map(o => renderRow(o, 'ask'))
          )}
        </div>

        {/* Current Spread / Price indicator */}
        <div style={{
          margin: 'var(--space-2) 0',
          padding: 'var(--space-2) 0',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          textAlign: 'center',
          fontWeight: 'bold',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-lg)',
          fontFamily: 'var(--font-mono)'
        }}>
          Live Market
        </div>

        {/* Bids (Buys) */}
        <div style={{ flex: 1, minHeight: '150px' }}>
          {isLoading ? (
            <LottieLoader size={45} text="Loading bids..." />
          ) : bids.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', padding: 'var(--space-4)' }}>No Bids</div>
          ) : (
            bids.slice(0, 15).map(o => renderRow(o, 'bid'))
          )}
        </div>
      </div>
    </div>
  );
};
