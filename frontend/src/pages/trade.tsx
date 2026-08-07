import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ClassicTrade } from '../components/ClassicTrade';
import { AdvancedTrade } from '../components/AdvancedTrade';

export default function TradePage() {
  const { isConnected } = useAccount();
  const [viewMode, setViewMode] = useState<'classic' | 'advanced'>('classic');



  const viewToggle = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '280px', flexShrink: 0, background: 'var(--color-overlay-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '4px' }}>
      <button 
        onClick={() => setViewMode('classic')}
        style={{
          padding: '6px 0',
          border: 'none',
          borderRadius: '6px',
          background: viewMode === 'classic' ? 'var(--color-accent-primary)' : 'transparent',
          color: viewMode === 'classic' ? '#000' : 'var(--color-text-secondary)',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontSize: '13px',
          textAlign: 'center'
        }}
      >
        Classic
      </button>
      <button 
        onClick={() => setViewMode('advanced')}
        style={{
          padding: '6px 0',
          border: 'none',
          borderRadius: '6px',
          background: viewMode === 'advanced' ? 'var(--color-accent-primary)' : 'transparent',
          color: viewMode === 'advanced' ? '#000' : 'var(--color-text-secondary)',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontSize: '13px',
          textAlign: 'center'
        }}
      >
        Advanced
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', marginTop: '16px' }}>
      {/* Render selected view */}
      {viewMode === 'classic' ? <ClassicTrade viewToggle={viewToggle} /> : <AdvancedTrade viewToggle={viewToggle} />}
    </div>
  );
}
