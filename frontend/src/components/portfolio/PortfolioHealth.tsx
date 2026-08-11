import React, { useState } from 'react';
import { Modal } from '../Modal';

export const PortfolioHealth: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>V2 Safety Model</h3>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="V2 safety model details"
            aria-label="View V2 safety model details"
            style={{ color: 'var(--color-text-muted)', cursor: 'pointer', border: 0, background: 'transparent', fontSize: '16px' }}
          >
            ⓘ
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          <div><strong style={{ color: 'var(--color-success)' }}>Vault:</strong> available and locked balances are enforced on-chain.</div>
          <div><strong style={{ color: 'var(--color-success)' }}>Settlement:</strong> exact-fill accounting, signature, replay, expiry, and FTSOv2 checks apply.</div>
          <div><strong style={{ color: 'var(--color-warning)' }}>Privacy:</strong> local_mock uses a hash commitment plus maker-signed plaintext matcher payload.</div>
        </div>
        <div style={{ marginTop: '14px', padding: '10px', borderRadius: '8px', background: 'var(--color-warning-bg)', color: 'var(--color-text-secondary)', fontSize: '11px', lineHeight: 1.5 }}>
          Coston2 testnet. Not audited. Not production-ready. No real funds.
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="V2 Safety and Privacy Boundaries" maxWidth="600px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>PrivaraVault V2 reserves committed balances and validates order state, token direction, exact-fill amounts, signatures, replay protection, expiry, oracle freshness, and the 200 bps FTSOv2 deviation guard.</p>
          <p style={{ margin: 0 }}>The current FCC path is <strong style={{ color: 'var(--color-text-primary)' }}>local_mock</strong>. It is not a production TEE: the matcher receives a maker-signed plaintext payload and verifies it against the on-chain commitment hash.</p>
          <p style={{ margin: 0 }}>Wallet addresses, deposits, withdrawals, order metadata, and settlement remain public or derivable on Coston2. Privara does not provide wallet anonymity, zero-knowledge privacy, or private settlement.</p>
          <button type="button" onClick={() => setIsModalOpen(false)} className="btn-premium-primary" style={{ width: '100%', padding: '12px' }}>Close</button>
        </div>
      </Modal>
    </>
  );
};
