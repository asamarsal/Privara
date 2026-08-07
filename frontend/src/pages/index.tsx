import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useWindowSize } from '../hooks/useWindowSize';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export default function Home() {
  const { isMobile, isTablet } = useWindowSize();
  const containerRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);

  const [typedTitle, setTypedTitle] = useState('');
  const fullTitle = "Trade FXRP without exposing your unmatched order terms.";

  const [typedHiw, setTypedHiw] = useState('');
  const fullHiw = "How Privara Works";

  useEffect(() => {
    let i = 0;
    setTypedTitle('');
    const timer = setInterval(() => {
      setTypedTitle(fullTitle.substring(0, i + 1));
      i++;
      if (i >= fullTitle.length) {
        clearInterval(timer);
      }
    }, 40);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useGSAP(() => {
    // 1. Hero Left Text Animation
    gsap.from('.hero-left-stagger', {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out',
      clearProps: 'transform,opacity',
    });

    // 2. Hero Right Mockup Animation
    gsap.from('.hero-right-mockup', {
      scale: 0.9,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      delay: 0.2
    });

    // 3. Hero Right Floating Charts
    gsap.from('.hero-right-charts > div', {
      x: 50,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out',
      delay: 0.6,
      clearProps: 'transform,opacity',
    });

    // 4. Features Grid ScrollTrigger
    gsap.from('.feature-card', {
      scrollTrigger: {
        trigger: '.features-section',
        start: 'top 80%',
        once: true,
      },
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out',
      clearProps: 'transform,opacity',
    });

    // 5. How It Works ScrollTrigger
    gsap.from('.how-it-works-line', {
      scrollTrigger: {
        trigger: '.how-it-works-section',
        start: 'top 80%',
        once: true,
      },
      opacity: 0,
      scaleX: 0,
      transformOrigin: 'left center',
      duration: 0.8,
      ease: 'power2.out',
    });

    gsap.from('.how-it-works-step', {
      scrollTrigger: {
        trigger: '.how-it-works-section',
        start: 'top 80%',
        once: true,
      },
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.15,
      ease: 'back.out(1.2)',
      delay: 0.2,
      clearProps: 'transform,opacity',
    });

    ScrollTrigger.create({
      trigger: '.how-it-works-section',
      start: 'top 80%',
      once: true,
      onEnter: () => {
        let i = 0;
        setTypedHiw('');
        const timer = setInterval(() => {
          setTypedHiw(fullHiw.substring(0, i + 1));
          i++;
          if (i >= fullHiw.length) {
            clearInterval(timer);
          }
        }, 50);
      }
    });

    // 6. Encrypted Orders ScrollTrigger
    gsap.from('.encrypted-order-card', {
      scrollTrigger: {
        trigger: '.encrypted-orders-section',
        start: 'top 85%',
        once: true,
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
    });

    // 7. Floating orb animations (homepage only, infinite loop)
    if (orb1Ref.current) {
      gsap.to(orb1Ref.current, {
        x: 120,
        y: 100,
        duration: 12,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    }
    if (orb2Ref.current) {
      gsap.to(orb2Ref.current, {
        x: -140,
        y: -110,
        duration: 15,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    }
    if (orb3Ref.current) {
      gsap.to(orb3Ref.current, {
        x: -100,
        y: 130,
        duration: 10,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    }
  }, { scope: containerRef });

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem', paddingBottom: '2rem' }}>

      {/* ─── Homepage-only animated background orbs ─── */}
      <div ref={orb1Ref} style={{ position: 'fixed', top: '-200px', left: '-200px', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,85,255,0.18) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, willChange: 'transform' }} />
      <div ref={orb2Ref} style={{ position: 'fixed', bottom: '-200px', right: '-150px', width: '650px', height: '650px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,85,255,0.15) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, willChange: 'transform' }} />
      <div ref={orb3Ref} style={{ position: 'fixed', top: '40%', right: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0, willChange: 'transform' }} />

      {/* ─── HERO SECTION ─── */}
      <section className={isMobile ? "" : "grid-2"} style={{
        display: isMobile ? 'flex' : 'grid',
        flexDirection: isMobile ? 'column' : undefined,
        gap: '3rem',
        alignItems: 'center',
        marginTop: '1rem'
      }}>

        {/* Left: Text Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Badge */}
          <div className="hero-left-stagger" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255,255,255,0.05)',
            padding: '4px 10px',
            borderRadius: '20px',
            width: 'fit-content',
            border: '1px solid var(--color-border)',
            fontSize: '11px',
            color: 'var(--color-text-secondary)'
          }}>
            <img src="/icon/flare-icononly-logo.svg" alt="Flare" style={{ width: '13px', height: '13px', objectFit: 'contain' }} />
            <span>Flare</span>
            <span style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '6px' }}>Coston2 Testnet</span>
          </div>

          {/* Heading */}
          <h1 className="hero-left-stagger" style={{ fontSize: isMobile ? '1.8rem' : isTablet ? '2.2rem' : '2.75rem', fontWeight: 800, lineHeight: 1.15, margin: 0 }}>
            {typedTitle.length <= 28 ? typedTitle : (
              <>
                {typedTitle.substring(0, 28)}
                <span style={{ color: 'var(--color-accent-primary)' }}>{typedTitle.substring(28)}</span>
              </>
            )}
          </h1>

          {/* Description */}
          <p className="hero-left-stagger" style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: '90%', marginTop: '12px', marginBottom: '16px' }}>
            Privara uses Flare Confidential Compute to privately compare buyer and seller limits, FTSOv2 to protect settlement pricing, and smart contracts to exchange FXRP and USDT0 on Coston2.
          </p>

          {/* Buttons */}
          <div className="hero-left-stagger" style={{ display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
            <Link href="/trade" className="btn-premium-primary">
              Launch App ↗
            </Link>
            <Link href="/how-it-works" className="btn-premium-secondary">
              How It Works ▷
            </Link>
          </div>

          {/* Warning */}
          <div className="hero-left-stagger" style={{ color: 'var(--color-error)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <span>⚠️</span> Testnet only — not for real funds
          </div>
        </div>

        {/* Right: Mockup Graphic (CSS art) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>



          <div className="hero-right-mockup hiw-neobrutalism" style={{
            background: 'var(--color-bg-glass)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '16px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            position: 'relative',
            zIndex: 2,
            width: '100%',
            maxWidth: '460px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-accent-primary)' }}>≈</span> Privara Match Engine
              </div>
              <div style={{ color: 'var(--color-accent-primary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🔒</span> Confidential Compute
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              {/* Buy Order Card */}
              <div style={{ background: 'var(--color-overlay-subtle)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '12px', flex: 1, width: isMobile ? '100%' : 'auto' }}>
                <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginBottom: '6px', letterSpacing: '0.5px' }}>BUY ORDER <span style={{ color: 'var(--color-accent-primary)' }}>(ENCRYPTED)</span></div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>I want to buy</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>10,000 FXRP</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Price limit (max)</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><span>🔒</span> Encrypted</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Quantity (min)</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><span>🔒</span> Encrypted</div>
                  </div>
                </div>
              </div>

              {/* Shield Icon */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 10 }}>
                <div style={{ width: '44px', height: '52px', background: 'rgba(0,231,223,0.05)', border: '1px solid var(--color-accent-primary)', borderRadius: '12px 12px 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 0 15px rgba(0,231,223,0.2)' }}>
                  🔒
                </div>
                <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2px' }}>
                  Confidential<br />Matching
                </div>
                <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  ✓ Match Found
                </div>
              </div>

              {/* Sell Order Card */}
              <div style={{ background: 'var(--color-overlay-subtle)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '12px', flex: 1, width: isMobile ? '100%' : 'auto' }}>
                <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginBottom: '6px', letterSpacing: '0.5px' }}>SELL ORDER <span style={{ color: 'var(--color-error)' }}>(ENCRYPTED)</span></div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>I want to sell</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>10,000 FXRP</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Price limit (min)</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><span>🔒</span> Encrypted</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Quantity (min)</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><span>🔒</span> Encrypted</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Swap visual */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', padding: '12px', background: 'var(--color-overlay-subtle)', borderRadius: '12px', border: '1px solid var(--color-border)', gap: isMobile ? '16px' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: isMobile ? '100%' : 'auto', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0055ff', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '12px' }}>X</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>FXRP</div>
                    <div style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>on Flare</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>Balance</div>
                  <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>25,430.12</div>
                </div>
              </div>

              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-bg-base)', border: '1px solid var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--color-accent-primary)', margin: isMobile ? '0' : '0 8px', transform: isMobile ? 'rotate(90deg)' : 'none' }}>
                ⇄
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: isMobile ? '100%' : 'auto', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#00e7df', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: '12px' }}>T</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>USDT0</div>
                    <div style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>on Flare</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>Balance</div>
                  <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>18,760.55</div>
                </div>
              </div>
            </div>


          </div>

          {/* Right side metric charts */}
          {!isMobile && (
            <div className="hero-right-charts" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '120px', flexShrink: 0 }}>
              <div className="hiw-neobrutalism" style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', width: '100%', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>POOL LIQUIDITY</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, margin: '6px 0 2px' }}>$2.48M</div>
                <div style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>Total Locked</div>
              </div>
              <div className="hiw-neobrutalism" style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', width: '100%', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>TOTAL VOLUME</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, margin: '6px 0 2px' }}>$1.37M</div>
                <div style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>24h Volume</div>
              </div>
              <div className="hiw-neobrutalism" style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', width: '100%', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>MATCHES (24H)</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, margin: '6px 0 2px' }}>128</div>
                <div style={{ fontSize: '9px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>✓ Successful</div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section className="features-section" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        marginTop: '-1.5rem',
        position: 'relative',
        zIndex: 10,
        alignItems: 'stretch'
      }}>
        {[
          { title: 'Private Orders', icon: '🔒', desc: 'Your price limits and quantities remain encrypted and are never revealed on-chain or to peers.' },
          { title: 'Confidential Matching', icon: '🛡️', desc: 'Flare Confidential Compute privately compares orders and returns only a match result—never the terms.' },
          { title: 'FTSOv2 Price Guard', icon: '📊', desc: 'FTSOv2 provides decentralized, manipulation-resistant pricing to protect fair settlement.' },
          { title: 'On-Chain Settlement', icon: '✅', desc: 'Smart contracts securely settle FXRP and USDT0 on Flare Coston2—verifiable and final.' }
        ].map(f => (
          <div key={f.title} className="feature-card hiw-neobrutalism" style={{
            flex: '1 1 220px',
            background: 'var(--color-bg-glass)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,231,223,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid rgba(0,231,223,0.2)' }}>
              {f.icon}
            </div>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5, flexGrow: 1 }}>
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* ─── HOW PRIVARA WORKS ─── */}
      <section className="how-it-works-section" style={{ marginTop: '1rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.5rem', marginTop: '1rem', marginBottom: '1.75rem' }}>{typedHiw}</h2>
        <div className="grid-4" style={{ gap: '1rem', position: 'relative' }}>
          {/* Connector line */}
          <div className="hide-mobile how-it-works-line" style={{ position: 'absolute', top: '20px', left: '10%', right: '10%', height: '1px', borderTop: '2px dashed var(--color-border)', zIndex: 0 }}></div>

          {[
            { num: 1, title: 'Deposit', icon: '💰', desc: 'Deposit FXRP or USDT0 into your non-custodial Privara vault.' },
            { num: 2, title: 'Encrypt Order', icon: '🔒', desc: 'Create your order with price and quantity limits. Terms are encrypted.' },
            { num: 3, title: 'Match', icon: '🤝', desc: 'The match engine privately compares orders and returns only a match result.' },
            { num: 4, title: 'Settle', icon: '🛡️', desc: 'Smart contracts settle the trade on Flare Coston2. Funds move, privacy stays.' }
          ].map(s => (
            <div key={s.num} className="how-it-works-step hiw-neobrutalism" style={{
              background: 'var(--color-bg-glass)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              position: 'relative',
              zIndex: 1,
              backdropFilter: 'blur(12px)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'var(--color-bg-base)', border: '2px solid var(--color-accent-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-accent-primary)', fontWeight: 800, flexShrink: 0, fontSize: '14px'
                }}>
                  {s.num}
                </div>
                <div style={{ fontSize: '18px' }}>{s.icon}</div>
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>{s.title}</h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── ENCRYPTED ORDERS DEMO ─── */}
        <div className="encrypted-orders-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '2.5rem' }}>
          {/* Buy Orders */}
          <div className="encrypted-order-card hiw-neobrutalism" style={{ '--hover-color': '#00bfb8', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0, 191, 184, 0.05)' } as React.CSSProperties}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>🛒</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>Encrypted Buy Orders</h3>
            </div>
            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', minWidth: '400px' }}>
                <thead>
                  <tr style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>Encrypted Price ⓘ</th>
                    <th style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>Encrypted Size ⓘ</th>
                    <th style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>Expiry ⓘ</th>
                    <th style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 1, exp: '23h 12m' },
                    { id: 2, exp: '22h 24m' },
                    { id: 3, exp: '21h 36m' },
                  ].map(row => (
                    <tr key={row.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 4px' }}>{row.id}</td>
                      <td style={{ padding: '12px 4px', color: 'var(--color-text-secondary)' }}>🔒 Encrypted</td>
                      <td style={{ padding: '12px 4px', color: 'var(--color-text-secondary)' }}>🔒 Encrypted</td>
                      <td style={{ padding: '12px 4px', color: 'var(--color-text-muted)' }}>{row.exp}</td>
                      <td style={{ padding: '12px 4px', color: '#00e676', fontWeight: 600 }}>●Active</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px', background: 'rgba(0, 191, 184, 0.08)', borderRadius: '12px', border: '1px solid rgba(0, 191, 184, 0.2)' }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>🛡️</span>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>All order details are encrypted and confidential until a match occurs.</span>
            </div>
          </div>

          {/* Sell Orders */}
          <div className="encrypted-order-card hiw-neobrutalism" style={{ '--hover-color': '#e62058', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(230, 32, 88, 0.05)' } as React.CSSProperties}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>🛒</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>Encrypted Sell Orders</h3>
            </div>
            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', minWidth: '400px' }}>
                <thead>
                  <tr style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>Encrypted Price ⓘ</th>
                    <th style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>Encrypted Size ⓘ</th>
                    <th style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>Expiry ⓘ</th>
                    <th style={{ textAlign: 'left', padding: '10px 4px', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 1, exp: '23h 12m' },
                    { id: 2, exp: '22h 24m' },
                    { id: 3, exp: '21h 36m' },
                  ].map(row => (
                    <tr key={row.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 4px' }}>{row.id}</td>
                      <td style={{ padding: '12px 4px', color: 'var(--color-text-secondary)' }}>🔒 Encrypted</td>
                      <td style={{ padding: '12px 4px', color: 'var(--color-text-secondary)' }}>🔒 Encrypted</td>
                      <td style={{ padding: '12px 4px', color: 'var(--color-text-muted)' }}>{row.exp}</td>
                      <td style={{ padding: '12px 4px', color: '#ff4d4d', fontWeight: 600 }}>●Active</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px', background: 'rgba(230, 32, 88, 0.08)', borderRadius: '12px', border: '1px solid rgba(230, 32, 88, 0.2)' }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>🛡️</span>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>Unmatched order terms remain confidential and are never revealed on-chain.</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
