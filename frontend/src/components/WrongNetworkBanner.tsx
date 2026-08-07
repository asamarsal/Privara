import React from 'react';

import { useNetwork } from '../hooks/useNetwork';

export const WrongNetworkBanner: React.FC = () => {
  const { isCorrectNetwork, switchToCoston2 } = useNetwork();

  if (isCorrectNetwork) return null;

  return (
    <div style={{ backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', textAlign: 'center', padding: 'var(--space-2)', fontSize: 'var(--font-size-sm)', fontWeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-4)' }}>
      You are connected to the wrong network. Please switch to Coston2.
      <button onClick={switchToCoston2} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
        Switch to Coston2
      </button>
    </div>
  );
};
