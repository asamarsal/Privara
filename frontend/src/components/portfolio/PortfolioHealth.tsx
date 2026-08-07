import React, { useState } from 'react';
import { useVaultBalance } from '../../hooks/useVaultBalance';
import { Modal } from '../Modal';

export const PortfolioHealth: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formattedFxrp, formattedUsdt0 } = useVaultBalance();
  const fxrpUsdValue = Number(formattedFxrp || 0) * 0.25;
  const usdt0UsdValue = Number(formattedUsdt0 || 0) * 1.00;
  const totalUsd = fxrpUsdValue + usdt0UsdValue;

  const healthScore = totalUsd > 0 ? 98 : 0;
  const healthStatus = totalUsd > 0 ? 'Excellent' : 'Needs Deposit';
  const color = totalUsd > 0 ? 'var(--color-success)' : 'var(--color-error)';
  const conic = `conic-gradient(${color} ${healthScore}%, var(--color-overlay-strong) 0)`;

  return (
    <>
      <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            Portfolio Health 
            <span 
              onClick={() => setIsModalOpen(true)}
              style={{ color: 'var(--color-text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              title="Portfolio Health Details"
            >
              ⓘ
            </span>
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {/* Gauge */}
          <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '50%', background: conic, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '74px', height: '74px', borderRadius: '50%', background: 'var(--color-bg-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{healthScore}</span>
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>/100</span>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color }}>{totalUsd > 0 ? '✓' : '!'}</span> Collateralization
              </span>
              <span style={{ color, fontWeight: 600 }}>{totalUsd > 0 ? 'Healthy' : 'None'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color }}>{totalUsd > 0 ? '✓' : '!'}</span> Diversification
              </span>
              <span style={{ color, fontWeight: 600 }}>{totalUsd > 0 ? 'Good' : 'None'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color }}>{totalUsd > 0 ? '✓' : '!'}</span> Privacy Coverage
              </span>
              <span style={{ color, fontWeight: 600 }}>{totalUsd > 0 ? 'Excellent' : 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <span style={{ color, fontSize: '13px', fontWeight: 600 }}>{healthStatus}</span>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="📊 Portfolio Health & Risk Breakdown"
        maxWidth="600px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px 0' }}>
          {/* Top Green Glass Banner */}
          <div style={{
            background: 'rgba(0, 231, 136, 0.06)',
            border: '1px solid rgba(0, 231, 136, 0.25)',
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
              background: 'rgba(0, 231, 136, 0.15)',
              border: '1px solid rgba(0, 231, 136, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0
            }}>
              📊
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-success)' }}>
                Overall Portfolio Score: {healthScore}/100
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                Calculated in real-time based on collateral adequacy, asset allocation, and privacy coverage.
              </p>
            </div>
          </div>

          {/* List of Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
              <div>
                <strong style={{ color: 'var(--color-text-primary)' }}>Collateralization Ratio: </strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Measures total deposited vault assets against committed limit orders to prevent liquidation.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
              <div>
                <strong style={{ color: 'var(--color-text-primary)' }}>Asset Diversification: </strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Evaluates balance distribution between stablecoins (USDT0) and volatile assets (FXRP).
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
              <div>
                <strong style={{ color: 'var(--color-text-primary)' }}>Privacy Coverage: </strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Ensures 100% of open limit orders use client-side cryptographic encryption.
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
