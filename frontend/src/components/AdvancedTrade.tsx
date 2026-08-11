import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useTheme } from '../contexts/ThemeContext';
import { BuyOrderForm } from '../components/BuyOrderForm';
import { SellOrderForm } from '../components/SellOrderForm';
import { LiveOrderBook } from '../components/LiveOrderBook';
import { LottieLoader } from './common/LottieLoader';
import { Modal } from './Modal';
import { useFtsoPrice } from '../hooks/useFtsoPrice';

const ORDER_TYPES = ['Market', 'Limit', 'Stop'];

// Promise to ensure TradingView script is only loaded once
let tvScriptLoadingPromise: Promise<void> | null = null;

export function AdvancedTrade({ viewToggle }: { viewToggle?: React.ReactNode }) {
  const { isConnected, chainId } = useAccount();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState('Limit');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const { priceFormatted } = useFtsoPrice();
  
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);

  // Load TradingView widget properly
  useEffect(() => {

    const createWidget = () => {
      if (containerRef.current && 'TradingView' in window) {
        setIsChartLoading(true);
        // Clear previous widget
        containerRef.current.innerHTML = '';
        
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: "BINANCE:XRPUSDT",
          interval: "15",
          timezone: "Etc/UTC",
          theme: isDark ? 'dark' : 'light',
          style: "1",
          locale: "en",
          enable_publishing: false,
          backgroundColor: isDark ? "rgba(19, 23, 34, 0)" : "rgba(255, 255, 255, 0)", // transparent bg to match glass
          gridColor: isDark ? "rgba(42, 46, 57, 0.2)" : "rgba(0, 0, 0, 0.05)",
          hide_side_toolbar: false, // SHOW DRAWING TOOLS
          allow_symbol_change: true,
          save_image: false,
          container_id: "tv_chart_container",
        });

        setTimeout(() => {
          setIsChartLoading(false);
        }, 1000);
      }
    };

    if (!tvScriptLoadingPromise) {
      tvScriptLoadingPromise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.id = 'tradingview-widget-loading-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.type = 'text/javascript';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }

    tvScriptLoadingPromise.then(createWidget);
  }, [theme, isDark]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 120px)', gap: 0 }}>
      {/* Main 3-column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr 320px',
        gap: 'var(--space-2)',
        flex: 1,
        minHeight: 0,
      }}>
        {/* ─── LEFT: Order Book ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
          {viewToggle}
          <div style={{ flex: 1, minHeight: 0 }}>
            <LiveOrderBook />
          </div>
        </div>

        {/* ─── CENTER: Chart + Stats header ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minHeight: 0, position: 'relative' }}>
          <div style={isExpanded ? {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999, // Ensure it's above everything including navbar
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            background: 'var(--color-bg-base)',
            padding: '20px',
            borderRadius: 0,
          } : { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1, minHeight: 0 }}>
            {/* Ticker header */}
          <div style={{
            background: 'var(--color-bg-glass)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-6)',
            flexWrap: 'wrap',
          }}>
            {/* Symbol */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)' }}>FXRP / USDT0</span>
              <span style={{ color: 'var(--color-warning)', cursor: 'pointer' }}>★</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Execution Model</span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
                Exact-fill
              </span>
            </div>

            {/* Expand icon */}
            <div 
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: isExpanded ? '1.5rem' : '1.2rem', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s', ...(!isExpanded ? { ':hover': { color: 'var(--color-text-primary)' } } : {}) }}
              title={isExpanded ? "Close Fullscreen" : "Expand Fullscreen"}
            >
              {isExpanded ? '✕' : '⤢'}
            </div>
          </div>

          {/* TradingView Chart */}
          <div style={{
            flex: 1,
            background: 'var(--color-bg-glass)',
            backdropFilter: 'blur(12px)',
            border: isExpanded ? 'none' : '1px solid var(--color-border)',
            borderRadius: isExpanded ? '8px' : 'var(--radius-lg)',
            overflow: 'hidden',
            minHeight: 0,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isChartLoading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg-surface)',
                zIndex: 10
              }}>
                <LottieLoader size={80} text="Loading TradingView chart..." />
              </div>
            )}
            <div
              id="tv_chart_container"
              ref={containerRef}
              style={{ width: '100%', height: '100%', minHeight: isExpanded ? '500px' : '350px' }}
            />
          </div>
        </div>
      </div>

        {/* ─── RIGHT: Order Entry Panel ─── */}
        <div style={{
          background: 'var(--color-bg-glass)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-4)',
        }}>
          {/* Buy / Sell Tabs — large pill style matching reference */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--color-bg-base)',
            borderRadius: 'var(--radius-md)',
            padding: '3px',
            marginBottom: 'var(--space-4)',
          }}>
            <button
              id="trade-buy-tab"
              onClick={() => setActiveTab('buy')}
              style={{
                padding: 'var(--space-2) 0',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 700,
                fontSize: 'var(--font-size-base)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                background: activeTab === 'buy' ? 'var(--color-accent-primary)' : 'transparent',
                color: activeTab === 'buy' ? 'var(--color-bg-base)' : 'var(--color-text-secondary)',
                boxShadow: activeTab === 'buy' ? '0 2px 12px var(--color-accent-glow)' : 'none',
              }}
            >
              Buy
            </button>
            <button
              id="trade-sell-tab"
              onClick={() => setActiveTab('sell')}
              style={{
                padding: 'var(--space-2) 0',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 700,
                fontSize: 'var(--font-size-base)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                background: activeTab === 'sell' ? 'var(--color-error)' : 'transparent',
                color: activeTab === 'sell' ? '#fff' : 'var(--color-text-secondary)',
                boxShadow: activeTab === 'sell' ? '0 2px 12px var(--color-error-bg)' : 'none',
              }}
            >
              Sell
            </button>
          </div>

          {/* Market / Limit / Stop sub-tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-4)' }}>
            {ORDER_TYPES.map(type => (
              <button key={type} type="button" onClick={() => setOrderType(type)} style={{
                padding: 'var(--space-2) var(--space-3)', background: 'transparent', border: 'none',
                borderBottom: `2px solid ${orderType === type ? 'var(--color-accent-primary)' : 'transparent'}`,
                color: orderType === type ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                fontWeight: orderType === type ? 600 : 400, fontSize: 'var(--font-size-sm)', cursor: 'pointer',
                transition: 'all var(--transition-fast)', marginBottom: '-1px',
              }}>{type}</button>
            ))}
            <span 
              onClick={() => setIsInfoModalOpen(true)}
              style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 'var(--font-size-base)', padding: 'var(--space-2)' }}
              title="Order Type Information"
            >
              ⓘ
            </span>
          </div>

          {/* Info Modal */}
          <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="⚖️ Order Types Information" maxWidth="600px">
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
                  📈
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-success)' }}>
                    Understanding Order Types
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    Limit uses a committed price bound. Market uses a 1% FTSOv2 collar. Stop remains dormant until its FTSOv2 trigger is reached, then executes as a stop-limit order.
                  </p>
                </div>
              </div>

              {/* List of Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>Market Order: </strong>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                       Uses a committed 1% collar around the live FTSOv2 price. Execution is protected but not guaranteed to be immediate.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>Limit Order: </strong>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      Specifies the maximum price to pay (buy) or minimum price to accept (sell). Guarantees price but not execution.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>Stop Order: </strong>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                       A stop-limit order that becomes eligible when the live FTSOv2 price reaches the committed trigger.
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsInfoModalOpen(false)}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '14px',
                  background: 'var(--color-accent-primary)',
                  color: '#000000',
                  fontWeight: 700,
                  fontSize: '15px',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 231, 136, 0.2)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
              >
                Got it, close
              </button>
            </div>
          </Modal>

          {/* Form */}
          <div style={{ flex: 1 }}>
            {activeTab === 'buy' ? <BuyOrderForm orderType={orderType} /> : <SellOrderForm orderType={orderType} />}
          </div>

          <div style={{
            marginTop: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-1)',
            color: 'var(--color-text-muted)',
            fontSize: '11px',
          }}>
            <span>🛡️</span>
            <span>local_mock uses a <strong style={{ color: 'var(--color-accent-primary)' }}>signed plaintext payload + on-chain hash</strong></span>
            <span style={{ cursor: 'pointer' }}>ⓘ</span>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM STATUS BAR ─── */}
      <div style={{
        background: 'var(--color-bg-glass)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        marginTop: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-8)',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)' }} />
           <span style={{ color: 'var(--color-text-muted)' }}>Wallet</span>
           <span style={{ color: chainId === 114 ? 'var(--color-success)' : 'var(--color-error)' }}>{!isConnected ? 'Disconnected' : chainId === 114 ? 'Coston2' : `Wrong network (${chainId})`}</span>
        </div>

        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>FXRP Price </span>
          <span style={{ color: 'var(--color-text-primary)' }}>${priceFormatted} </span>
          <span style={{ color: 'var(--color-success)' }}>Live FTSO</span>
        </div>

        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Order Types </span>
          <span style={{ color: 'var(--color-success)' }}>Market · Limit · Stop</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Deployment</span>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected && chainId === 114 ? 'var(--color-success)' : 'var(--color-warning)', boxShadow: `0 0 6px ${isConnected && chainId === 114 ? 'var(--color-success)' : 'var(--color-warning)'}` }} />
          <span style={{ color: isConnected && chainId === 114 ? 'var(--color-success)' : 'var(--color-warning)' }}>{isConnected && chainId === 114 ? 'V2 Coston2' : 'Wallet action required'}</span>
        </div>
      </div>
    </div>
  );
}
