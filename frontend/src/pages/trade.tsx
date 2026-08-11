import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ClassicTrade } from '../components/ClassicTrade';
import { AdvancedTrade } from '../components/AdvancedTrade';

export default function TradePage() {
  const { isConnected } = useAccount();
  const [viewMode, setViewMode] = useState<'classic' | 'advanced'>('classic');

  if (!isConnected) {
    return <div className="page-container" style={{ paddingTop: 'var(--space-8)', textAlign: 'center' }}><h2>Connect Your Wallet</h2><p style={{ color: 'var(--color-text-secondary)' }}>Connect an injected wallet on Coston2 to access Classic or Advanced limit-order trading.</p></div>;
  }

  const viewToggle = (
    <div aria-label="Trade view" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '280px', flexShrink: 0, background: 'var(--color-overlay-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '4px' }}>
      {(['classic', 'advanced'] as const).map(view => <button key={view} type="button" aria-pressed={viewMode === view} onClick={() => setViewMode(view)} style={{ padding: '6px 0', border: 'none', borderRadius: '6px', background: viewMode === view ? 'var(--color-accent-primary)' : 'transparent', color: viewMode === view ? '#000' : 'var(--color-text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px', textAlign: 'center' }}>{view === 'classic' ? 'Classic' : 'Advanced'}</button>)}
    </div>
  );

  return <div style={{ display: 'flex', flexDirection: 'column', height: '100%', marginTop: '16px' }}>{viewMode === 'classic' ? <ClassicTrade viewToggle={viewToggle} /> : <AdvancedTrade viewToggle={viewToggle} />}</div>;
}
