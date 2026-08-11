import React from 'react';
import { deployment } from '../../config/deployment';

const LINKS = [
  { label: 'Flare Network Explorer', url: deployment.explorerUrl },
  { label: 'Coston2 Testnet Explorer', url: deployment.explorerUrl },
  { label: 'FTSOv2 Price Feed', url: 'https://dev.flare.network/ftso/overview' },
  { label: 'Privara Contracts', url: `${deployment.explorerUrl}/address/${deployment.vault}` },
];

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

export const ExplorerLinksCard: React.FC = () => {
  return (
    <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="#a855f7" strokeWidth="1.5"/>
          <path d="M5 8h6M8 5.5C9.5 5.5 11 6.5 11 8s-1.5 2.5-3 2.5M8 5.5C6.5 5.5 5 6.5 5 8s1.5 2.5 3 2.5" stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Explorer Links</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {LINKS.map((link, i) => (
          <a key={i} href={link.url} target="_blank" rel="noreferrer"
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', borderRadius: '8px',
              color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '13px',
              transition: 'background 0.15s, color 0.15s',
              background: 'transparent'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-overlay-medium)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            {link.label}
            <ExternalLinkIcon />
          </a>
        ))}
      </div>
    </div>
  );
};
