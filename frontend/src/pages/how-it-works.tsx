import React, { useRef, useState, useEffect } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const FAQCard = ({ faq, isOpen, onToggle }: { faq: any; isOpen: boolean; onToggle: () => void }) => {
  return (
    <div className="hiw-faq-card hiw-neobrutalism" style={{
      background: 'var(--color-bg-glass)',
      border: '1px solid var(--color-border)',
      borderRadius: '20px',
      padding: '24px',
      display: 'flex', flexDirection: 'column',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: 'var(--shadow-card)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      alignSelf: 'start',
    }} onClick={onToggle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(0,191,184,0.08)',
            border: '1px solid rgba(0,191,184,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
          }}>{faq.icon}</div>
          <div style={{ color: 'var(--color-text-primary)', fontSize: '15px', fontWeight: 600, lineHeight: 1.4 }}>{faq.q}</div>
        </div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 700, paddingLeft: '12px' }}>
          {isOpen ? '▲' : '▼'}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.3s ease',
      }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingTop: '16px' }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.25)',
              color: '#a855f7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', flexShrink: 0
            }}>✓</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>{faq.a}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function HowItWorksPage() {
  const { isMobile, isTablet } = useWindowSize();
  const containerRef = useRef<HTMLDivElement>(null);
  const [openCards, setOpenCards] = useState<Record<number, boolean>>({});

  const [typedTitle, setTypedTitle] = useState('');
  const fullTitle = "How Privara Works";

  useEffect(() => {
    let i = 0;
    setTypedTitle('');
    const timer = setInterval(() => {
      setTypedTitle(fullTitle.substring(0, i + 1));
      i++;
      if (i >= fullTitle.length) {
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  useGSAP(() => {
    gsap.from('.hiw-header-stagger', {
      y: 30, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out', clearProps: 'transform,opacity'
    });
    gsap.from('.hiw-step-card', {
      scrollTrigger: { trigger: '.hiw-steps-section', start: 'top 80%', once: true },
      y: 50, opacity: 0, duration: 0.55, stagger: 0.1, ease: 'power2.out', clearProps: 'transform,opacity'
    });
    gsap.from('.hiw-middle-card', {
      scrollTrigger: { trigger: '.hiw-middle-section', start: 'top 80%', once: true },
      y: 40, opacity: 0, duration: 0.65, stagger: 0.15, ease: 'power2.out', clearProps: 'transform,opacity'
    });
    gsap.from('.hiw-faq-card', {
      scrollTrigger: { trigger: '.hiw-faq-section', start: 'top 85%', once: true },
      y: 40, opacity: 0, duration: 0.55, stagger: 0.12, ease: 'back.out(1.3)', clearProps: 'transform,opacity'
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="page-container" style={{
      maxWidth: '1400px',
      margin: '0 auto',
      paddingTop: isMobile ? '0px' : '8px',
      paddingBottom: '16px',
      position: 'relative',
      zIndex: 1,
    }}>

      {/* ─── Header Section ─── */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px', gap: isMobile ? '24px' : '0' }}>
        <div style={{ maxWidth: '800px' }}>
          <h1 className="hiw-header-stagger" style={{ fontSize: isMobile ? '2rem' : '3rem', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--color-text-primary)' }}>
            {typedTitle.substring(0, 4)}
            <span style={{ color: '#3B82F6' }}>{typedTitle.length > 4 ? typedTitle.substring(4, 11) : ''}</span>
            {typedTitle.length > 11 ? typedTitle.substring(11) : ''}
          </h1>
          <p className="hiw-header-stagger" style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
            Privara enables private, efficient, and verifiable trading on Flare. Your order terms stay confidential until a match is found and settled on-chain.
          </p>
        </div>

        {/* Right Header Content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: '12px' }}>
          <div className="hiw-header-stagger" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px',
            background: 'rgba(0, 231, 223, 0.07)',
            border: '1px solid rgba(0, 231, 223, 0.2)',
            borderRadius: '20px',
            color: 'var(--color-accent-primary)',
            fontSize: '13px', fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}>
            <img src="/icon/lockicon.png" alt="Lock" style={{ width: '14px', height: '14px', objectFit: 'contain' }} /> Confidential on Flare
          </div>

          <div className="hiw-header-stagger" style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '16px 24px',
            background: 'var(--color-bg-glass)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            backdropFilter: 'blur(16px)',
            boxShadow: 'var(--shadow-card)',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '24px' }}>🛡️</div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px', marginBottom: '4px' }}>Powered by Flare Confidential Compute</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Built on FTSOv2 and Coston2, with local-mock matching disclosed for this hackathon MVP.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5-Step Flow Diagram ─── */}
      <div className="hiw-steps-section" style={{ position: 'relative', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'stretch', gap: '16px', marginBottom: '48px' }}>

        {/* Connector line */}
        <div className="hide-mobile" style={{ position: 'absolute', top: '140px', left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, var(--color-accent-primary), transparent)', opacity: 0.2, zIndex: 0 }} />

        {[
          {
            step: 1, title: 'Deposit', icon: '📥',
            desc: 'Deposit test-only FXRP or USDT0 into PrivaraVault V2 on Coston2.',
            privacyType: 'public', privacyTitle: 'Visible on-chain',
            privacyDesc: 'Wallet address, asset, deposit amount, and timing',
            accentColor: '#a855f7', accentAlpha: 'rgba(168,85,247,',
          },
          {
            step: 2, title: 'Create Order Commitment', icon: '📝',
            desc: 'Sign a canonical plaintext payload and commit its hash on-chain. Hashing is not encryption.',
            privacyType: 'public', privacyTitle: 'Metadata is public',
            privacyDesc: 'Maker, side, token, amount, commitment hash, expiry, and timing',
            accentColor: '#a855f7', accentAlpha: 'rgba(168,85,247,',
          },
          {
            step: 3, title: 'Local-Mock Matching', icon: '/icon/lockicon.png',
            desc: 'The disclosed local matcher verifies and compares maker-signed plaintext payloads; production FCC privacy remains roadmap work.',
            privacyType: 'private', privacyTitle: 'Not posted as plaintext on-chain',
            privacyDesc: 'Limit and stop bounds are delivered to the local matcher, not published in the OrderCommitted event',
            accentColor: '#00bfb8', accentAlpha: 'rgba(0,191,184,',
          },
          {
            step: 4, title: 'FTSOv2 Price Guard', icon: '📈',
            desc: 'FTSOv2 provides decentralized, manipulation-resistant pricing to protect fair settlement.',
            privacyType: 'public', privacyTitle: 'Visible on-chain',
            privacyDesc: 'FTSOv2 price feed reference and timestamp',
            accentColor: '#00bfb8', accentAlpha: 'rgba(0,191,184,',
          },
          {
            step: 5, title: 'Onchain Settlement', icon: '⛓️',
            desc: 'Smart contract securely settles FXRP and USDT0 on Flare (Coston2) — verifiable and final.',
            privacyType: 'public', privacyTitle: 'Visible on-chain',
            privacyDesc: 'Settlement tx hash, assets, amounts, and counterparties',
            accentColor: '#0055ff', accentAlpha: 'rgba(0,85,255,',
          }
        ].map((item, idx) => (
          <React.Fragment key={idx}>
            <div className="hiw-step-card hiw-neobrutalism" style={{
              '--hover-color': item.accentColor,
              flex: 1, display: 'flex', flexDirection: 'column',
              background: 'var(--color-bg-glass)',
              border: '1px solid var(--color-border)',
              borderRadius: '20px',
              zIndex: 1,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: 'var(--shadow-card)'
            } as React.CSSProperties}
            >
              {/* Top content */}
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                {/* Step + Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', width: '100%' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: `${item.accentAlpha}0.12)`,
                    border: `1px solid ${item.accentAlpha}0.4)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: item.accentColor,
                    flexShrink: 0,
                  }}>
                    {item.step}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '13px', textAlign: 'left' }}>{item.title}</div>
                </div>

                {/* Icon */}
                <div style={{ fontSize: '40px', marginBottom: '20px' }}>
                  {item.icon.startsWith('/') ? <img src={item.icon} alt="Icon" style={{ width: '36px', height: '36px', objectFit: 'contain' }} /> : item.icon}
                </div>

                <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', lineHeight: 1.7 }}>{item.desc}</div>
              </div>

              {/* Bottom Privacy Badge */}
              <div style={{
                padding: '14px 24px',
                background: item.privacyType === 'private'
                  ? 'rgba(168,85,247,0.06)'
                  : 'rgba(0,191,184,0.06)',
                borderTop: `1px solid ${item.privacyType === 'private' ? 'rgba(168,85,247,0.15)' : 'rgba(0,191,184,0.15)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: item.privacyType === 'private' ? '#a855f7' : 'var(--color-accent-primary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  <span>{item.privacyType === 'private' ? <img src="/icon/lockicon.png" alt="Lock" style={{ width: '12px', height: '12px', objectFit: 'contain' }} /> : '👁️'}</span>
                  {item.privacyTitle}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', lineHeight: 1.5 }}>{item.privacyDesc}</div>
              </div>
            </div>

            {idx < 4 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-accent-primary)', fontSize: '20px', zIndex: 1, opacity: 0.5,
              }}>
                {isMobile ? '↓' : '→'}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ─── Middle Section ─── */}
      <div className="hiw-middle-section" style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1.5fr', gap: '24px', marginBottom: '48px' }}>

        {/* Privacy Summary */}
        <div className="hiw-middle-card hiw-neobrutalism" style={{
          background: 'var(--color-bg-glass)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          padding: isMobile ? '20px' : '32px',
          display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '24px' : '32px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-card)',
        }}>
          {/* Private column */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              }}><img src="/icon/lockicon.png" alt="Lock" style={{ width: '18px', height: '18px', objectFit: 'contain' }} /></div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-primary)', fontWeight: 700 }}>What stays private</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                'All order terms (price, size, side, type, expiry) remain encrypted.',
                'Wallet balances and identities are never shared.',
                'Only a match result (yes/no + settlement data) is returned.',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'rgba(168,85,247,0.1)',
                    border: '1px solid rgba(168,85,247,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', color: '#a855f7', flexShrink: 0, marginTop: '1px',
                  }}>✓</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>{text}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: isMobile ? '100%' : '1px', height: isMobile ? '1px' : 'auto', background: 'var(--color-border)' }} />

          {/* Public column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(0,191,184,0.08)',
                border: '1px solid rgba(0,191,184,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              }}>👁️</div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-primary)', fontWeight: 700 }}>What is visible on-chain</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {[
                'FTSOv2 price feed and timestamp used.',
                'Settlement transaction with assets and amounts.',
                'Counterparties (addresses) and tx hash.',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: 'rgba(0,191,184,0.08)',
                    border: '1px solid rgba(0,191,184,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', color: 'var(--color-accent-primary)', flexShrink: 0, marginTop: '1px',
                  }}>✓</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>{text}</div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 'auto', padding: '12px 16px',
              background: 'rgba(0,85,255,0.07)',
              border: '1px solid rgba(0,85,255,0.2)',
              borderRadius: '10px',
              color: '#4d9fff', fontSize: '12px', textAlign: 'center', fontWeight: 600,
            }}>
              No order details are ever published on-chain.
            </div>
          </div>
        </div>

        {/* System Architecture */}
        <div className="hiw-middle-card hiw-neobrutalism" style={{
          background: 'var(--color-bg-glass)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          padding: isMobile ? '20px' : '32px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-card)',
        }}>
          <h3 style={{ margin: '0 0 32px 0', fontSize: '1rem', color: 'var(--color-text-primary)', fontWeight: 700 }}>System Architecture</h3>

          {/* Nodes row */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', gap: isMobile ? '16px' : '8px' }}>
            {/* Dashed connector line */}
            {!isMobile && (
              <div style={{
                position: 'absolute', top: '32px', left: '10%', right: '10%',
                height: '1px', borderBottom: '1px dashed var(--color-border)', zIndex: 0,
              }} />
            )}

            {[
              { title: 'Browser', icon: '🌐', sub: 'User creates order in the browser.' },
              { title: 'Privara Vault', icon: '🏦', sub: 'Encrypts and stores orders securely.' },
              { title: 'Matcher', icon: '⚙️', sub: 'Matches signed payloads in disclosed local-mock mode.' },
              { title: 'FCC', icon: '🛡️', sub: 'Executes confidential compute workloads.' },
              { title: 'FTSOv2', icon: '📈', sub: 'Provides secure price reference.' }
            ].map((node, idx) => (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                alignItems: isMobile ? 'center' : 'center',
                gap: isMobile ? '16px' : '0',
                padding: isMobile ? '12px 16px' : '0',
                background: isMobile ? 'rgba(255,255,255,0.02)' : 'transparent',
                borderRadius: isMobile ? '12px' : '0',
                border: isMobile ? '1px solid var(--color-border)' : 'none',
                zIndex: 1,
                flex: 1,
                minWidth: 0
              }}>
                <div style={{
                  width: isMobile ? '44px' : '64px',
                  height: isMobile ? '44px' : '64px',
                  borderRadius: '14px',
                  background: 'var(--color-overlay-medium)',
                  border: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isMobile ? '20px' : '28px',
                  marginBottom: isMobile ? '0' : '12px',
                  backdropFilter: 'blur(8px)',
                  flexShrink: 0,
                }}>
                  {node.icon}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: isMobile ? 'left' : 'center' }}>
                  <div style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{node.title}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', lineHeight: 1.4 }}>{node.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Onchain Settlement label */}
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 24px',
              background: 'rgba(0,191,184,0.06)',
              border: '1px solid rgba(0,191,184,0.2)',
              borderRadius: '10px',
              color: 'var(--color-accent-primary)', fontSize: '13px', fontWeight: 600,
            }}>
              <span style={{ fontSize: '16px' }}>⛓️</span>
              Onchain Settlement (Coston2)
            </div>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '11px', marginTop: '16px' }}>
            Smart contract settles FXRP and USDT0 on Flare.
          </div>
        </div>
      </div>

      {/* ─── FAQ ─── */}
      <h2 className="hiw-faq-section" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 24px 0', color: 'var(--color-text-primary)' }}>
        Frequently Asked Questions
      </h2>
      <div className="hiw-faq-section grid-3" style={{ gap: '24px', alignItems: 'start', minHeight: '180px' }}>
        {[
          {
            q: 'Is this mainnet?',
            a: 'Privara is a Coston2 testnet hackathon MVP. It is not deployed on Flare Mainnet and must not be used with real funds.',
            icon: '🌐',
          },
          {
            q: 'Are unmatched order terms public?',
            a: 'No. The current MVP is not fully private: maker, side, token, amount, expiry, commitment, and transaction metadata are public, while the local matcher receives the signed order payload.',
            icon: '🔒',
          },
          {
            q: 'How is the price determined?',
            a: 'Privara uses FTSOv2 price feeds for decentralized, manipulation-resistant pricing. The price reference and timestamp are included in every settlement.',
            icon: '📈',
          }
        ].map((faq, idx) => (
          <FAQCard
            key={idx}
            faq={faq}
            isOpen={!!openCards[idx]}
            onToggle={() => setOpenCards(prev => ({ ...prev, [idx]: !prev[idx] }))}
          />
        ))}
      </div>

    </div>
  );
}
