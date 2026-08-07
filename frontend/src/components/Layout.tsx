import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import Link from 'next/link';
import { Copy } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}
import { TestnetWarning } from './TestnetWarning';
import { WrongNetworkBanner } from './WrongNetworkBanner';
import { FaucetButton } from './FaucetButton';
import { ThemeToggle, SunIcon } from './ThemeToggle';

import { useRouter } from 'next/router';
import { useWallet } from '../hooks/useWallet';
import { useVaultBalance } from '../hooks/useVaultBalance';
import { useToast } from './ToastContext';
import { useWindowSize } from '../hooks/useWindowSize';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isConnected, address, connect, disconnect } = useWallet();
  const { formattedFxrp, formattedUsdt0, isLoading } = useVaultBalance();
  const { addToast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isMobile } = useWindowSize();
  const router = useRouter();
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!footerRef.current) return;

    // Brand column: slide in from left
    gsap.from('.footer-brand', {
      scrollTrigger: {
        trigger: footerRef.current,
        start: 'top 90%',
        once: true,
      },
      x: -40,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    });

    // Link columns: stagger up
    gsap.from('.footer-col', {
      scrollTrigger: {
        trigger: footerRef.current,
        start: 'top 90%',
        once: true,
      },
      y: 40,
      opacity: 0,
      duration: 0.65,
      stagger: 0.12,
      ease: 'power2.out',
      delay: 0.15,
    });

    // Flare box: scale in + fade
    gsap.from('.footer-flare-box', {
      scrollTrigger: {
        trigger: footerRef.current,
        start: 'top 90%',
        once: true,
      },
      scale: 0.85,
      opacity: 0,
      duration: 0.7,
      ease: 'back.out(1.5)',
      delay: 0.4,
    });

    // Social icons: pop in one by one
    gsap.from('.footer-social-icon', {
      scrollTrigger: {
        trigger: footerRef.current,
        start: 'top 90%',
        once: true,
      },
      scale: 0,
      opacity: 0,
      duration: 0.4,
      stagger: 0.08,
      ease: 'back.out(2)',
      delay: 0.6,
    });

    // Bottom copyright: fade in last
    gsap.from('.footer-bottom', {
      scrollTrigger: {
        trigger: footerRef.current,
        start: 'top 90%',
        once: true,
      },
      opacity: 0,
      y: 16,
      duration: 0.8,
      delay: 0.7,
      ease: 'power2.out',
    });
  }, { scope: footerRef });

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (address) {
      navigator.clipboard.writeText(address);
      addToast('Wallet address copied to clipboard! 📋', 'success', 'top-right');
    }
  };

  const navLinks = [
    { href: '/trade', label: 'Trade', icon: '💱' },
    { href: '/portfolio', label: 'Portfolio', icon: '💼' },
    { href: '/activity', label: 'Activity', icon: '📊' },
    { href: '/how-it-works', label: 'How It Works', icon: '📖' },
  ];

  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!drawerRef.current || !overlayRef.current) return;

    if (isMobileMenuOpen) {
      gsap.to(overlayRef.current, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' });
      gsap.to(drawerRef.current, { x: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out' });
      gsap.fromTo('.drawer-item',
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.1 }
      );
    } else {
      gsap.to(overlayRef.current, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' });
      gsap.to(drawerRef.current, { x: '100%', autoAlpha: 0, duration: 0.3, ease: 'power3.in' });
    }
  }, [isMobileMenuOpen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>

      {/* ─── Background orbs moved to index.tsx (homepage only) ─── */}

      <TestnetWarning />
      <WrongNetworkBanner />

      <header style={{ backgroundColor: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)', padding: isMobile ? '12px 16px' : '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', height: '36px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', height: '100%' }}>
            <img src="/icon/privarawithtext-icon.png" alt="Privara" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
          </Link>
          {!isMobile && (
            <nav style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', height: '100%' }}>
              {navLinks.map((link) => {
                const isActive = router.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                      fontWeight: isActive ? 700 : 500,
                      borderBottom: isActive ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                      paddingBottom: '2px',
                      transition: 'all 0.2s ease',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: '100%'
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', height: '36px' }}>
          {!isMobile && (
            <span className="btn-premium-secondary" style={{ height: '36px', padding: '0 12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Coston2
            </span>
          )}
          {isConnected ? (
            <div style={{ position: 'relative', height: '36px' }}>
              <div className="btn-premium-secondary" style={{ display: 'flex', alignItems: 'center', height: '36px', padding: 0, overflow: 'hidden' }}>
                <div
                  onClick={() => setShowDetails(!showDetails)}
                  style={{
                    padding: '0 0.8rem',
                    height: '100%',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    userSelect: 'none',
                  }}
                  title="Click to view balances & details"
                >
                  <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
                  {!isMobile && <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{showDetails ? '▲' : '▼'}</span>}
                </div>
                {!isMobile && (
                  <button
                    onClick={() => {
                      disconnect();
                      addToast('Wallet disconnected successfully', 'success', 'top-right');
                    }}
                    style={{
                      padding: '0 0.8rem',
                      height: '100%',
                      fontSize: '14px',
                      background: 'transparent',
                      border: 'none',
                      borderLeft: '1px solid var(--color-border)',
                      color: 'var(--color-error)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: 600
                    }}
                    title="Disconnect Wallet"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {/* Wallet Details & Balances Popover */}
              {showDetails && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  width: '100%',
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  boxShadow: 'var(--shadow-dropdown)',
                  zIndex: 1000
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Wallet Address</span>
                    <button
                      onClick={handleCopyAddress}
                      style={{
                        background: 'var(--color-overlay-medium)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        color: 'var(--color-accent-primary)',
                        fontSize: '11px',
                        padding: '3px 8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-primary)', wordBreak: 'break-all', marginBottom: '16px', background: 'var(--color-overlay-subtle)', padding: '6px 8px', borderRadius: '4px' }}>
                    {address}
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                    Vault Balances
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-overlay-subtle)', padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#0055ff', color: '#fff', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</div>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>FXRP</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {isLoading ? '...' : formattedFxrp}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-overlay-subtle)', padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#00e7df', color: '#000', fontSize: '9px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>T</div>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>USDT0</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {isLoading ? '...' : formattedUsdt0}
                      </span>
                    </div>
                  </div>

                  {isMobile && (
                    <button
                      onClick={() => { 
                        disconnect(); 
                        setShowDetails(false); 
                        addToast('Wallet disconnected successfully', 'success', 'top-right');
                      }}
                      style={{
                        marginTop: '16px',
                        width: '100%',
                        padding: '8px',
                        fontSize: '14px',
                        background: 'var(--color-error-bg)',
                        border: '1px solid var(--color-error)',
                        borderRadius: '6px',
                        color: 'var(--color-error)',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Disconnect Wallet
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button className="btn-premium-primary" onClick={connect} style={{ padding: isMobile ? '8px 12px' : undefined, fontSize: isMobile ? '14px' : undefined }}>
              {isMobile ? 'Connect' : 'Connect Wallet'}
            </button>
          )}

          {!isMobile && <ThemeToggle />}
          {!isMobile && <FaucetButton />}

          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', fontSize: '24px', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          )}
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobile && (
        <>
          <div
            ref={overlayRef}
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              zIndex: 9998,
              visibility: 'hidden',
              opacity: 0
            }}
          />
          <div ref={drawerRef} style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '85%',
            maxWidth: '380px',
            background: 'var(--color-bg-glass)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderLeft: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-dropdown)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            overflowY: 'auto',
            transform: 'translateX(100%)',
            visibility: 'hidden',
            opacity: 0
          }}>
            {/* Header inside drawer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-accent-primary)' }}>Privara</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', fontSize: '28px', cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {navLinks.map((link) => {
                const isActive = router.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="drawer-item"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '16px 20px',
                      borderRadius: '20px',
                      background: isActive ? 'var(--color-accent-glow)' : 'var(--color-overlay-subtle)',
                      border: isActive ? '1px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                      color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                      textDecoration: 'none',
                      boxShadow: isActive ? '0 8px 32px var(--color-accent-glow)' : 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '14px',
                        background: isActive ? 'var(--color-accent-glow)' : 'var(--color-overlay-medium)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.25rem',
                        boxShadow: isActive ? 'inset 0 0 12px var(--color-accent-glow)' : 'none'
                      }}>
                        {link.icon}
                      </div>
                      <span style={{ fontSize: '1.15rem', fontWeight: isActive ? 700 : 500, letterSpacing: '0.3px' }}>{link.label}</span>
                    </div>
                    <span style={{ color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', fontSize: '1.5rem', fontWeight: 300 }}>›</span>
                  </Link>
                );
              })}
            </nav>

            <div className="drawer-item" style={{
              marginTop: 'auto',
              background: 'var(--color-overlay-subtle)',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid var(--color-border)',
              display: 'flex', flexDirection: 'column', gap: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '14px',
                    background: 'var(--color-overlay-medium)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <SunIcon color="var(--color-accent-primary)" />
                  </div>
                  <span style={{ fontSize: '1.15rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>Appearance</span>
                </div>
                <ThemeToggle />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Testnet Tokens</span>
                <FaucetButton />
              </div>
            </div>
          </div>
        </>
      )}

      <main style={{ flex: 1, padding: (router.pathname === '/trade' || router.pathname === '/activity' || router.pathname === '/portfolio') ? 'var(--space-4) 24px' : 'var(--space-4) var(--space-8) var(--space-8)', maxWidth: (router.pathname === '/trade' || router.pathname === '/activity' || router.pathname === '/portfolio') ? '100%' : '1440px', margin: '0 auto', width: '100%' }}>
        {children}
      </main>

      {/* ─── PREMIUM FOOTER ─── */}
      <footer ref={footerRef} style={{ 
        marginTop: '1.5rem',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-footer-bg)',
        padding: isMobile ? '1.5rem 1rem 1rem' : '1.5rem 2rem 1rem',
        color: 'var(--color-text-secondary)',
        fontSize: '13px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>

          {/* Top Section: Responsive Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? '1.5rem 1rem' : '2rem', marginBottom: '1rem' }}>

            {/* Column 1: Brand */}
            <div className="footer-brand" style={{ display: 'flex', flexDirection: 'column', gridColumn: isMobile ? '1 / -1' : 'auto', order: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isMobile ? '12px' : '16px' }}>
                <img src="/icon/privaraicononly-icon.png" alt="Privara" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Privara</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                Confidential trading for a more private and fair DeFi future, protecting your orders with Flare Confidential Compute.
              </p>
            </div>

            {/* Column 5: Flare & Network Cards (Placed above Product links on mobile using order: 2) */}
            <div className="footer-flare-box" style={{
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              gap: '10px',
              justifyContent: isMobile ? 'stretch' : 'flex-end',
              alignItems: isMobile ? 'stretch' : 'flex-start',
              gridColumn: isMobile ? '1 / -1' : 'auto',
              order: isMobile ? 2 : 5,
              marginBottom: isMobile ? '0.5rem' : '0',
              width: '100%',
            }}>
              {/* Card 1: Flare */}
              <div
                className="btn-premium-glass-red"
                style={{
                  padding: isMobile ? '10px 12px' : '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  flex: isMobile ? 1 : 'none',
                  width: isMobile ? 'auto' : '100%',
                  maxWidth: isMobile ? 'none' : '200px',
                }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <img src="/icon/flare-icononly-logo.svg" alt="Flare" style={{ width: '18px', height: '18px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ecosystem</span>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: isMobile ? '12px' : '13px', whiteSpace: 'nowrap' }}>Built on Flare</span>
                </div>
              </div>

              {/* Card 2: Network */}
              <div
                className="btn-premium-primary"
                style={{
                  padding: isMobile ? '10px 12px' : '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  flex: isMobile ? 1 : 'none',
                  width: isMobile ? 'auto' : '100%',
                  maxWidth: isMobile ? 'none' : '200px',
                }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}>🌐</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Network</span>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: isMobile ? '12px' : '13px', whiteSpace: 'nowrap' }}>Coston2 Testnet</span>
                </div>
              </div>
            </div>

            {/* Column 2: Product */}
            <div className="footer-col" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px', order: isMobile ? 3 : 2 }}>
              <h4 style={{ color: 'var(--color-text-primary)', fontSize: '14px', margin: '0 0 4px 0' }}>Product</h4>
              <Link href="#" style={{ color: 'var(--color-footer-link)', textDecoration: 'none' }}>Overview</Link>
              <Link href="#" style={{ color: 'var(--color-footer-link)', textDecoration: 'none' }}>Features</Link>
              <Link href="/trade" style={{ color: 'var(--color-footer-link)', textDecoration: 'none' }}>Launch App ↗</Link>
            </div>

            {/* Column 3: How It Works */}
            <div className="footer-col" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px', order: isMobile ? 3 : 3 }}>
              <h4 style={{ color: 'var(--color-text-primary)', fontSize: '14px', margin: '0 0 4px 0' }}>How It Works</h4>
              <Link href="#" style={{ color: 'var(--color-footer-link)', textDecoration: 'none' }}>Overview</Link>
              <Link href="#" style={{ color: 'var(--color-footer-link)', textDecoration: 'none' }}>Architecture</Link>
              <Link href="#" style={{ color: 'var(--color-footer-link)', textDecoration: 'none' }}>Settlement</Link>
            </div>

            {/* Column 4: Community */}
            <div className="footer-col" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px', order: isMobile ? 3 : 4 }}>
              <h4 style={{ color: 'var(--color-text-primary)', fontSize: '14px', margin: '0 0 4px 0' }}>Community</h4>
              <Link href="#" style={{ color: 'var(--color-footer-link)', textDecoration: 'none' }}>Discord</Link>
              <Link href="#" style={{ color: 'var(--color-footer-link)', textDecoration: 'none' }}>Twitter</Link>
              <Link href="#" style={{ color: 'var(--color-footer-link)', textDecoration: 'none' }}>GitHub</Link>
            </div>

          </div>

          {/* Bottom Section: Copyright & Legal */}
          <div className="footer-bottom" style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: isMobile ? '12px' : '24px',
            fontSize: '12px',
            color: 'var(--color-text-primary)',
            textAlign: 'center'
          }}>
            <span>&copy; {new Date().getFullYear()} Privara. All rights reserved. | Powered by Flare Network</span>
          </div>

        </div>
      </footer>
    </div>
  );
};
