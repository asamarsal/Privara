import React from 'react';
import { useVaultBalance } from '../hooks/useVaultBalance';

export const VaultBalance: React.FC = () => {
  const { formattedFxrp, formattedUsdt0, isLoading } = useVaultBalance();

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Vault Balances</h3>
      
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>FXRP</span>
            <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>{formattedFxrp}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>USDT0</span>
            <span style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>{formattedUsdt0}</span>
          </div>
        </div>
      )}
    </div>
  );
};
