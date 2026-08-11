import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ClassicTrade } from '../components/ClassicTrade';
import { AdvancedTrade } from '../components/AdvancedTrade';

export default function TradePage() {
  const { isConnected } = useAccount();
  const [viewMode, setViewMode] = useState<'classic' | 'advanced'>('classic');

  const viewToggle = (
    <div aria-label="Trade view" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '280px', flexShrink: 0, background: 'var(--color-overlay-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '4px' }}>
      {(['classic', 'advanced'] as const).map(view => <button key={view} type="button" aria-pressed={viewMode === view} onClick={() => setViewMode(view)} style={{ padding: '6px 0', border: 'none', borderRadius: '6px', background: viewMode === view ? 'var(--color-accent-primary)' : 'transparent', color: viewMode === view ? '#000' : 'var(--color-text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px', textAlign: 'center' }}>{view === 'classic' ? 'Classic' : 'Advanced'}</button>)}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', marginTop: '16px' }}>
      {!isConnected && (
        <div role="status" style={{ margin: '0 16px 16px', padding: '12px 16px', border: '1px solid var(--color-warning)', borderRadius: '10px', background: 'var(--color-warning-bg)', color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Wallet not connected.</strong>{' '}
          You can explore Classic and Advanced trading in read-only mode. Connect a wallet on Coston2 when you place an order or perform a vault transaction.
        </div>
      )}
      {viewMode === 'classic' ? <ClassicTrade viewToggle={viewToggle} /> : <AdvancedTrade viewToggle={viewToggle} />}
    </div>
  );
}
