import React, { useState } from 'react';

export const TestnetWarning: React.FC = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div style={{
      backgroundColor: 'var(--color-warning-bg)',
      color: 'var(--color-warning)',
      padding: '8px 16px',
      fontSize: 'var(--font-size-sm)',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <style>{`
        .testnet-desktop { display: inline; }
        .testnet-mobile { display: none; }
        @media (max-width: 768px) {
          .testnet-desktop { display: none; }
          .testnet-mobile { display: inline; }
        }
      `}</style>
      <span className="testnet-desktop">This is a testnet demonstration. No real funds are used.</span>
      <span className="testnet-mobile">Testnet demonstration. No real funds are used.</span>
      <button
        onClick={() => setVisible(false)}
        style={{
          position: 'absolute',
          right: '16px',
          background: 'transparent',
          border: 'none',
          color: 'var(--color-warning)',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '2px 6px',
          lineHeight: 1,
          opacity: 0.8,
        }}
        title="Close banner"
      >
        ✕
      </button>
    </div>
  );
};
