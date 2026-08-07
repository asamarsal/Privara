import React from 'react';
import { useVaultBalance } from '../../hooks/useVaultBalance';

import { useActivity } from '../../hooks/useActivity';

export const TopMetrics: React.FC = () => {
  const { formattedFxrp, formattedUsdt0, isLoading } = useVaultBalance();
  const { orders } = useActivity();
  const fxrpUsdValue = Number(formattedFxrp || 0) * 0.25;
  const usdt0UsdValue = Number(formattedUsdt0 || 0) * 1.00;


  const totalValue = (fxrpUsdValue + usdt0UsdValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  // Basic calculation for metrics since we don't have historical data yet
  const openOrdersCount = orders.length; // Approximate, as we fetch all orders
  const settledTradesCount = 0; // Backend settlements endpoint pending

  return (
    <div className="layout-top-metrics">
      
      {/* Total Balance */}
      <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Total Vault Balance</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            ${isLoading ? '...' : totalValue}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Live FTSO Rates
          </div>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,231,223,0.1)', color: '#00e7df', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
          💰
        </div>
      </div>

      {/* 24h Volume */}
      <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>24h Volume</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            $0.00
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Data pending indexer
          </div>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(168,85,247,0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
          📊
        </div>
      </div>

      {/* Open Orders */}
      <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Active Orders</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            {openOrdersCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Across all pairs
          </div>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,85,255,0.1)', color: '#0055ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
          📑
        </div>
      </div>

      {/* Settled Trades */}
      <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Settled Trades</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            {settledTradesCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Confidentially matched
          </div>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(230,32,88,0.1)', color: '#E62058', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
          ⚡
        </div>
      </div>

    </div>
  );
};
