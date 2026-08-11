import React, { useState } from 'react';
import { useActivity } from '../../hooks/useActivity';
import { Modal } from '../Modal';

export const PrivacyStatus: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { orders } = useActivity();
  const activeCount = orders.length;

  return (
    <>
      <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            Privacy Status 
            <span 
              onClick={() => setIsModalOpen(true)}
              style={{ color: 'var(--color-text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              title="Privacy Status Details"
            >
              ⓘ
            </span>
          </h3>
          <span style={{ color: 'var(--color-success)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ color: 'var(--color-success)' }}>●</span> Local Mock / Testnet</span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, background: 'rgba(0, 231, 223, 0.05)', border: '1px solid rgba(0, 231, 223, 0.2)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ color: '#00e7df', fontSize: '18px', display: 'flex', alignItems: 'center' }}>
              <img src="/icon/lockicon.png" alt="Lock" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Confidential Matching</span>
              <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 600 }}>Active</span>
            </div>
          </div>

          <div style={{ flex: 1, background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ color: '#a855f7', fontSize: '18px', display: 'flex', alignItems: 'center' }}>
              <img src="/icon/lockicon.png" alt="Lock" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Data Encryption</span>
              <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 600 }}>Active</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Securely processing {activeCount} encrypted orders.</span>
          <span onClick={() => setIsModalOpen(true)} style={{ color: 'var(--color-accent-primary)', cursor: 'pointer' }}>Learn more ↗</span>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="🛡️ Privacy Status & Encryption Enclave"
        maxWidth="600px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px 0' }}>
          {/* Top Teal Glass Banner */}
          <div style={{
            background: 'rgba(0, 231, 223, 0.06)',
            border: '1px solid rgba(0, 231, 223, 0.25)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(0, 231, 223, 0.15)',
              border: '1px solid rgba(0, 231, 223, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0
            }}>
              <img src="/icon/lockicon.png" alt="Lock" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#00e7df' }}>
                FCC Integration Architecture
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                Current execution uses a disclosed local mock; production confidential hardware and account-identity privacy are not active.
              </p>
            </div>
          </div>

          {/* List of Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
              <span style={{ color: '#00e7df', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
              <div>
                <strong style={{ color: 'var(--color-text-primary)' }}>Local-Mock Matcher: </strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Orders are currently evaluated by a disclosed local mock adapter; no production TEE is active.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
              <span style={{ color: '#00e7df', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
              <div>
                <strong style={{ color: 'var(--color-text-primary)' }}>Signed Payload and Hash Commitment: </strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  The browser signs a canonical payload and commits its hash. Side, size, wallet, and expiry remain public.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
              <span style={{ color: '#00e7df', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
              <div>
                <strong style={{ color: 'var(--color-text-primary)' }}>FTSOv2 Manipulation Guard: </strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  FTSOv2 provides an on-chain reference guard; settlements outside the configured 2% threshold revert.
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(false)}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '14px',
              background: 'var(--color-accent-primary)',
              color: '#000000',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 231, 223, 0.3)'
            }}
          >
            Got it, close
          </button>
        </div>
      </Modal>
    </>
  );
};
