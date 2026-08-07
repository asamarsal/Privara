import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useVaultBalance } from '../../hooks/useVaultBalance';
import { Modal } from '../Modal';
import { DepositForm } from '../DepositForm';
import { WithdrawalForm } from '../WithdrawalForm';

export const VaultHoldings: React.FC = () => {
  const router = useRouter();
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | 'info' | null>(null);
  const { formattedFxrp, formattedUsdt0, isLoading } = useVaultBalance();
  const fxrpUsdValue = Number(formattedFxrp || 0) * 0.25;
  const usdt0UsdValue = Number(formattedUsdt0 || 0) * 1.00;
  const totalUsd = fxrpUsdValue + usdt0UsdValue;
  const totalValue = totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fxrpAlloc = totalUsd > 0 ? (fxrpUsdValue / totalUsd) * 100 : 0;
  const usdt0Alloc = totalUsd > 0 ? (usdt0UsdValue / totalUsd) * 100 : 0;

  const realAssets = [
    { symbol: 'FXRP', name: 'Privara FXRP', balance: formattedFxrp || '0.00', value: `$${fxrpUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, alloc: `${fxrpAlloc.toFixed(1)}%`, color: 'var(--color-accent-primary)' },
    { symbol: 'USDT0', name: 'USDT0', balance: formattedUsdt0 || '0.00', value: `$${usdt0UsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, alloc: `${usdt0Alloc.toFixed(1)}%`, color: '#00e7df' }
  ].filter(a => Number(a.balance) > 0);

  const conicGradient = realAssets.length > 0 
    ? `conic-gradient(var(--color-accent-primary) ${fxrpAlloc}%, #00e7df 0 100%)`
    : 'conic-gradient(var(--color-border) 100%, transparent 0)';

  return (
    <>
      <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Vault Holdings 
              <span 
                onClick={() => setModalType('info')} 
                style={{ color: 'var(--color-text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                title="Privara Order Encryption Details"
              >
                ⓘ
              </span>
            </h3>
            <span onClick={() => router.push('/activity')} style={{ color: 'var(--color-accent-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>View All</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Vault Value</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '4px 0' }}>${isLoading ? '...' : totalValue} <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>USD</span></div>
            </div>
            
            <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: conicGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>100%</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 0.8fr', gap: '8px', fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            <div>Asset</div>
            <div style={{ textAlign: 'left' }}>Balance</div>
            <div style={{ textAlign: 'left' }}>USD Value</div>
            <div style={{ textAlign: 'right' }}>Alloc</div>
          </div>

          {realAssets.length > 0 ? realAssets.map(asset => (
            <div key={asset.symbol} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 0.8fr', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: asset.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>{asset.symbol[0]}</div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{asset.symbol}</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left', fontWeight: 500, fontFamily: 'monospace' }}>{asset.balance}</div>
              <div style={{ textAlign: 'left', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{asset.value}</div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span style={{ fontWeight: 600 }}>{asset.alloc}</span>
                <div style={{ width: '100%', height: '4px', background: 'var(--color-overlay-strong)', borderRadius: '2px' }}>
                  <div style={{ width: asset.alloc, height: '100%', background: asset.color, borderRadius: '2px' }} />
                </div>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '20px' }}>
              No assets in vault. Deposit to start trading.
            </div>
          )}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button 
            className="btn-premium-buy"
            onClick={() => setModalType('deposit')}
            style={{ padding: '12px', fontSize: '13px' }}
          >
            Deposit
          </button>
          <button 
            className="btn-premium-sell"
            onClick={() => setModalType('withdraw')}
            style={{ padding: '12px', fontSize: '13px' }}
          >
            Withdraw
          </button>
        </div>
      </div>

      <Modal 
        isOpen={modalType !== null} 
        onClose={() => setModalType(null)}
        title={modalType === 'info' ? '🔒 Privara Vault Security & Asset Privacy' : 'Vault Operations'}
        maxWidth={modalType === 'info' ? '600px' : '500px'}
      >
        {modalType === 'info' ? (
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
                🛡️
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#00e7df' }}>
                  Non-Custodial & Encrypted Vault
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  Your assets are held securely in smart contracts on Flare Coston2 with private balance tracking.
                </p>
              </div>
            </div>

            {/* List of Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
                <span style={{ color: '#00e7df', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Non-Custodial Smart Contracts: </strong>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Deposits are held in self-executing smart contracts, ensuring you retain full control.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
                <span style={{ color: '#00e7df', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Encrypted Commitment Vault: </strong>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Active order funds are cryptographically locked, preventing MEV bots from front-running.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
                <span style={{ color: '#00e7df', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Automated Deposit & Withdrawal: </strong>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Instant, on-chain deposits and withdrawals processed on Coston2 Testnet.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
                <span style={{ color: '#00e7df', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>FTSOv2 Real-Time Valuation: </strong>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Portfolio balances are calculated dynamically using Flare's decentralized price feeds.
                  </span>
                </div>
              </div>
            </div>

            {/* Got it, close Button */}
            <button
              onClick={() => setModalType(null)}
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
                transition: 'opacity 0.2s ease',
                boxShadow: '0 4px 14px rgba(0, 231, 223, 0.3)'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Got it, close
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
              <button 
                onClick={() => setModalType('deposit')}
                style={{ 
                  flex: 1, 
                  padding: '10px 16px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  background: modalType === 'deposit' ? 'var(--color-accent-primary)' : 'transparent',
                  color: modalType === 'deposit' ? '#fff' : 'var(--color-text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                Deposit
              </button>
              <button 
                onClick={() => setModalType('withdraw')}
                style={{ 
                  flex: 1, 
                  padding: '10px 16px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  background: modalType === 'withdraw' ? 'var(--color-accent-primary)' : 'transparent',
                  color: modalType === 'withdraw' ? '#fff' : 'var(--color-text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                Withdraw
              </button>
            </div>

            {modalType === 'deposit' && <DepositForm />}
            {modalType === 'withdraw' && <WithdrawalForm />}
          </>
        )}
      </Modal>
    </>
  );
};
