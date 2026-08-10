import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther, formatEther, parseAbi, stringToHex } from 'viem';
import { hashOrder, Order, OrderSide, OrderType } from '@privara/shared';
import { useVaultBalance } from '../hooks/useVaultBalance';
import { saveOrderToHistory } from '../hooks/useActivity';
import { TransactionState } from './TransactionState';
import { useToast } from './ToastContext';
import { useWindowSize } from '../hooks/useWindowSize';
import { Modal } from './Modal';

const vaultAbi = parseAbi([
  'function commitOrder(bytes32 orderId, uint8 side, address tokenIn, uint256 amountIn, bytes32 encryptedCommitment, uint64 expiry)'
]);

export function ClassicTrade({ viewToggle }: { viewToggle?: React.ReactNode }) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContractAsync: writeCommitOrder } = useWriteContract();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [hideBalances, setHideBalances] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const { addToast } = useToast();
  const { isMobile } = useWindowSize();
  const [mobileOrderTab, setMobileOrderTab] = useState<'buy' | 'sell'>('buy');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  
  const [typedHiwTitle, setTypedHiwTitle] = useState('');
  const fullHiwTitle = "How Privara Works";

  useEffect(() => {
    if (showHowItWorks && howItWorksRef.current) {
      gsap.fromTo(
        howItWorksRef.current,
        { opacity: 0, y: 30, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
      );
      gsap.fromTo(
        howItWorksRef.current.querySelectorAll('.how-it-works-step'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out', delay: 0.1 }
      );
      gsap.fromTo(
        howItWorksRef.current.querySelectorAll('.encrypted-order-card'),
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out', delay: 0.25 }
      );
    }
  }, [showHowItWorks]);

  useEffect(() => {
    if (showHowItWorks) {
      let i = 0;
      setTypedHiwTitle('');
      const timer = setInterval(() => {
        setTypedHiwTitle(fullHiwTitle.substring(0, i + 1));
        i++;
        if (i >= fullHiwTitle.length) {
          clearInterval(timer);
        }
      }, 50);
      return () => clearInterval(timer);
    }
  }, [showHowItWorks]);
  const vaultAddress = "0xa479Bc0C4B000D0dcD6FaC3BB9E71B830eBE048E";
  const fxrpAddress = "0x12967a98792fc53Fb39E91d9B69917B5D32fb011";
  const usdt0Address = "0xDC7E830282489f5e461C4bfC0deE292fD9591C86";

  // Balances
  const { usdt0Balance, fxrpBalance, formattedUsdt0, formattedFxrp, refetch } = useVaultBalance();

  const fxrpBalanceDisplay = hideBalances ? '••••••' : formattedFxrp;
  const usdtBalanceDisplay = hideBalances ? '••••••' : formattedUsdt0;
  const fxrpUsdDisplay = hideBalances ? '••••' : (Number.parseFloat(formattedFxrp) * 0.975).toFixed(2);
  const usdtUsdDisplay = hideBalances ? '••••' : (Number.parseFloat(formattedUsdt0) * 1).toFixed(2);

  // Form State
  const [amountStr, setAmountStr] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [expiryHours, setExpiryHours] = useState('24');
  const [txState, setTxState] = useState<'idle' | 'awaiting_approval' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>();
  const [txError, setTxError] = useState('');

  const pctSteps = [25, 50, 75, 100];
  const [sliderVal, setSliderVal] = useState(0);

  const handlePct = (pct: number) => {
    setSliderVal(pct);
    if (mode === 'buy') {
      if (usdt0Balance === undefined || !priceStr) return;
      try {
        const budget = (usdt0Balance * BigInt(pct)) / 100n;
        const price = parseEther(priceStr);
        if (price === 0n) return;
        const amount = (budget * parseEther('1')) / price;
        setAmountStr(formatEther(amount));
      } catch { }
    } else {
      if (fxrpBalance === undefined) return;
      const budget = (fxrpBalance * BigInt(pct)) / 100n;
      setAmountStr(formatEther(budget));
    }
  };

  const handleSubmit = async () => {
    if (!isConnected) {
      addToast('Harap hubungkan wallet', 'error', 'top-right');
      return;
    }
    if (!address) return;

    if (!amountStr || !priceStr) {
      addToast('Amount and Limit Price must be filled first', 'error', 'top-right');
      return;
    }

    try {
      setTxState('awaiting_approval');
      setTxError('');

      const fxrpAmount = parseEther(amountStr);
      const limitPrice = parseEther(priceStr);

      if (fxrpAmount <= 0n || limitPrice <= 0n) {
        throw new Error('Amounts must be greater than zero');
      }

      const expiry = BigInt(Math.floor(Date.now() / 1000) + Number.parseInt(expiryHours) * 3600);
      const nonce = BigInt(Math.floor(Math.random() * 1000000));
      const chainId = 114n; // Coston2
      const orderId = stringToHex(`order-${Date.now()}-${Math.floor(Math.random() * 1000)}`, { size: 32 });

      let tokenIn: `0x${string}`;
      let tokenOut: `0x${string}`;
      let amountIn: bigint;
      let orderSide: OrderSide;

      if (mode === 'buy') {
        orderSide = OrderSide.buy;
        tokenIn = usdt0Address;
        tokenOut = fxrpAddress;
        amountIn = (fxrpAmount * limitPrice) / 10n ** 18n; // Quote amount we put in
      } else {
        orderSide = OrderSide.sell;
        tokenIn = fxrpAddress;
        tokenOut = usdt0Address;
        amountIn = fxrpAmount; // Base amount we put in
      }

      const order: Order = {
        orderId,
        maker: address,
        side: orderSide,
        tokenIn,
        tokenOut,
        amountIn,
        limitPrice,
        orderType: OrderType.limit,
        stopPrice: 0n,
        expiry: Number(expiry),
        nonce,
        chainId: Number(chainId),
        vaultAddress
      };

      const ciphertext = hashOrder(order);

      const commitHash = await writeCommitOrder({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'commitOrder',
        args: [
          orderId,
          orderSide === OrderSide.buy ? 0 : 1, // 0 for buy, 1 for sell
          tokenIn,
          amountIn,
          ciphertext as `0x${string}`,
          expiry
        ]
      });

      setTxHash(commitHash);
      setTxState('pending');

      saveOrderToHistory({
        orderId,
        side: orderSide === OrderSide.buy ? 0 : 1,
        tokenIn,
        amountIn,
        expiry: Number(expiry),
        txHash: commitHash,
        timestamp: Date.now(),
        status: 'pending'
      });

      // Simulate success
      setTimeout(() => {
        setTxState('success');
        setAmountStr('');
        setPriceStr('');
        refetch();
        addToast('Order successfully submitted! (Top Right)', 'success', 'top-right');
        addToast('Order successfully submitted! (Bottom Center)', 'success', 'bottom-center');
      }, 1500);

    } catch (err: any) {
      setTxState('error');
      setTxError(err.message || 'Failed to submit order');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <div className="trade-layout" style={{
        display: isMobile ? 'flex' : 'grid',
        flexDirection: isMobile ? 'column' : undefined,
        gridTemplateColumns: isMobile ? undefined : '280px 1fr 320px',
      }}>

        {/* LEFT: Vault Balances */}
        <div style={{ order: isMobile ? 2 : 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {viewToggle}
          <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Vault Balances</h3>
            <button
              onClick={() => setHideBalances(!hideBalances)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', color: hideBalances ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', padding: '2px 4px', borderRadius: '4px', transition: 'all 0.2s' }}
              title={hideBalances ? 'Show balances' : 'Hide/Sensored balances'}
            >
              {hideBalances ? '🙈' : '👁️'}
            </button>
          </div>

          <div style={{ background: 'var(--color-overlay-subtle)', borderRadius: '12px', padding: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0055ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 700 }}>X</div>
                <span style={{ fontWeight: 600 }}>FXRP</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fxrpBalanceDisplay}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>≈ ${fxrpUsdDisplay} USD</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => router.push('/portfolio?action=deposit&token=FXRP')}
                style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', padding: '6px 0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                ↓ Deposit
              </button>
              <button
                onClick={() => router.push('/portfolio?action=withdraw&token=FXRP')}
                style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', padding: '6px 0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                ↑ Withdraw
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--color-overlay-subtle)', borderRadius: '12px', padding: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#00e7df', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#000', fontWeight: 800 }}>T</div>
                <span style={{ fontWeight: 600 }}>USDT0</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{usdtBalanceDisplay}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>≈ ${usdtUsdDisplay} USD</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => router.push('/portfolio?action=deposit&token=USDT0')}
                style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', padding: '6px 0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                ↓ Deposit
              </button>
              <button
                onClick={() => router.push('/portfolio?action=withdraw&token=USDT0')}
                style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', padding: '6px 0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                ↑ Withdraw
              </button>
            </div>
          </div>

          <button
            onClick={() => router.push('/portfolio')}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', padding: '4px 0', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}
          >
            View full portfolio <span>›</span>
          </button>

          {/* Privacy Notice under View full portfolio */}
          <div style={{ background: 'var(--color-overlay-subtle)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '14px', marginTop: '4px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent-primary)' }}>
              <span>🛡️</span> Privacy Notice
            </h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              All orders are encrypted using FTSOv2 Confidential Compute. Unmatched orders, including price, size, and expiry, remain confidential and are never revealed on-chain.
            </p>
            <Link href="/how-it-works" style={{ color: 'var(--color-accent-primary)', fontSize: '11px', textDecoration: 'none', fontWeight: 600 }}>Learn more about Privara privacy ↗</Link>
          </div>
        </div>
        </div>

        {/* CENTER: Private Trade Panel */}
        <div style={{ order: isMobile ? 1 : 2, background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-primary)' }}>
              <span>🛡️</span>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>Private Trade</h3>
            </div>

            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setShowPrivacyModal(true)}
                style={{ fontSize: '12px', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s', userSelect: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
              >
                How private trading works <span>ⓘ</span>
              </div>
            </div>
          </div>

          {/* Toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--color-overlay-subtle)', borderRadius: '12px', padding: '4px', marginBottom: '24px', border: '1px solid var(--color-border)' }}>
            <button onClick={() => setMode('buy')} style={{ padding: '8px 0', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', background: mode === 'buy' ? 'var(--color-success)' : 'transparent', color: mode === 'buy' ? '#000' : 'var(--color-text-secondary)', transition: 'all 0.2s' }}>Buy</button>
            <button onClick={() => setMode('sell')} style={{ padding: '8px 0', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', background: mode === 'sell' ? 'var(--color-error)' : 'transparent', color: mode === 'sell' ? '#fff' : 'var(--color-text-secondary)', transition: 'all 0.2s' }}>Sell</button>
          </div>

          {/* Inputs Grid */}
          <div className={isMobile ? "grid-1" : "grid-2"} style={{ gap: '16px', marginBottom: '16px' }}>
            {/* Amount */}
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>I want to {mode === 'buy' ? 'buy' : 'sell'}</div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-overlay-input)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px 12px' }}>
                <input type="text" placeholder="0.00" value={amountStr} onChange={e => setAmountStr(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontSize: '1.2rem', fontWeight: 600, width: '100%', outline: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-bg-base)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#0055ff', color: '#fff', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>X</div>
                  <span style={{ fontWeight: 600 }}>FXRP</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginLeft: '2px' }}>▾</span>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>≈ $0.00 USD</div>
            </div>

            {/* Price Limit */}
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>I want to {mode === 'buy' ? 'pay' : 'receive'} (Limit Price)</div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-overlay-input)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px 12px' }}>
                <input type="text" placeholder="0.00" value={priceStr} onChange={e => setPriceStr(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontSize: '1.2rem', fontWeight: 600, width: '100%', outline: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-bg-base)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#00e7df', color: '#000', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>T</div>
                  <span style={{ fontWeight: 600 }}>USDT0</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginLeft: '2px' }}>▾</span>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>≈ $1.00 USD per FXRP</div>
            </div>
          </div>

          {/* Percent buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {pctSteps.map(p => (
              <button key={p} onClick={() => handlePct(p)} style={{ flex: 1, padding: '4px 0', background: sliderVal === p ? 'var(--color-accent-glow)' : 'var(--color-overlay-subtle)', border: `1px solid ${sliderVal === p ? 'var(--color-accent-primary)' : 'var(--color-border)'}`, borderRadius: '6px', color: sliderVal === p ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)', fontSize: '11px', cursor: 'pointer' }}>
                {p === 100 ? 'Max' : `${p}%`}
              </button>
            ))}
          </div>

          {/* Expiry & Status */}
          <div className={isMobile ? "grid-1" : "grid-2"} style={{ gap: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Order Expiry</div>
              <select value={expiryHours} onChange={e => setExpiryHours(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--color-bg-select)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', outline: 'none', cursor: 'pointer' }}>
                <option value="1">1 Hour</option>
                <option value="6">6 Hours</option>
                <option value="24">24 Hours</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Encryption Status</div>
              <div 
                onClick={() => setShowPrivacyModal(true)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '10px 12px', 
                  background: 'rgba(0, 231, 223, 0.08)', 
                  border: '1px solid rgba(0, 231, 223, 0.25)', 
                  borderRadius: '8px', 
                  color: 'var(--color-success)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease',
                }}
                title="Click to view Privacy & Encryption Details"
              >
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Fully Encrypted</span> 
                <span style={{ 
                  background: 'rgba(0, 231, 223, 0.15)', 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '11px',
                  fontWeight: 700 
                }}>ⓘ</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ marginTop: 'auto' }}>
            <button 
              onClick={handleSubmit} 
              disabled={txState === 'awaiting_approval' || txState === 'pending'} 
              className={mode === 'buy' ? 'btn-premium-buy' : 'btn-premium-sell'}
              style={{ width: '100%', padding: '14px', fontSize: '1.1rem', gap: '8px' }}
            >
              {txState === 'awaiting_approval' ? 'Confirm in Wallet...' : txState === 'pending' ? 'Submitting...' : 'Review & Submit Encrypted Order'}
            </button>
            <div style={{ textAlign: 'center', color: 'var(--color-accent-primary)', fontSize: '11px', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>🛡️</span> Your order terms, size, and identity are confidential until a match is made.
            </div>
          </div>

          <TransactionState state={txState} txHash={txHash} errorMessage={txError} />

        </div>

        {/* RIGHT: Stats */}
        <div style={{ order: isMobile ? 3 : 3, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📈</span> Live FTSOv2 Reference Price
            </h3>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>FXRP / USDT0 <span style={{ background: 'rgba(150,0,255,0.2)', color: '#d080ff', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>FTSOv2</span></div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>0.9753 <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 400 }}>USDT0</span></div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>≈ $0.9753 USD</div>

            {/* Fake SVG Chart */}
            <div style={{ height: '60px', marginTop: '16px', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 200 50" preserveAspectRatio="none">
                <polyline fill="none" stroke="#d080ff" strokeWidth="2" points="0,40 20,35 40,38 60,25 80,30 100,10 120,20 140,5 160,25 180,15 200,20" />
                <circle cx="200" cy="20" r="3" fill="#d080ff" />
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
              <span>Last updated: 12:45:30 UTC</span>
              <span style={{ color: 'var(--color-accent-primary)' }}>↻ 12s</span>
            </div>
          </div>

          <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> Open Orders Snapshot
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
              <span>My Open Orders</span>
              <span style={{ color: 'var(--color-text-primary)' }}>2</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
              <span>Potential Matches</span>
              <span style={{ color: 'var(--color-text-primary)' }}>0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
              <span>Last Match (UTC)</span>
              <span style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>12:41:02</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Link href="/activity" style={{ color: 'var(--color-text-muted)', fontSize: '12px', textDecoration: 'none' }}>View all activity <span>›</span></Link>
            </div>
          </div>

          {/* Trigger Card for How It Works */}
          <div 
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            style={{ 
              background: 'var(--color-bg-glass)', 
              border: '1px solid var(--color-border)', 
              borderRadius: '16px', 
              padding: '16px', 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              transition: 'all 0.25s ease',
              marginTop: '4px',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Header row: Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0
              }}>💡</div>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                How Privara Works
              </span>
            </div>

            {/* Description text */}
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              Learn about confidential matching workflow & view live encrypted order book.
            </p>

            {/* Action Button */}
            <div style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              background: showHowItWorks ? 'rgba(0, 231, 223, 0.15)' : 'var(--color-bg-base)',
              border: `1px solid ${showHowItWorks ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
              color: showHowItWorks ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              marginTop: '2px'
            }}>
              <span>{showHowItWorks ? 'Hide Details' : 'View Details & Workflow'}</span>
              <span style={{ transform: showHowItWorks ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', fontSize: '10px' }}>▼</span>
            </div>
          </div>

        </div>

      </div>

      {showHowItWorks && (
        <div ref={howItWorksRef} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1rem' }}>
          {/* ─── HOW PRIVARA WORKS ─── */}
          <section className="how-it-works-section" style={{ marginTop: '0.25rem' }}>
            <h2 style={{ textAlign: 'center', fontSize: '1.5rem', marginTop: '1rem', marginBottom: '1.25rem' }}>{typedHiwTitle}</h2>
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
                        <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
                        <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
      )}

      {/* PRIVACY & ENCRYPTION DIALOG MODAL */}
      <Modal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title="🔒 Privara Order Encryption Details">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--color-text-primary)' }}>
          <div style={{ padding: '14px', background: 'rgba(0, 231, 223, 0.08)', border: '1px solid rgba(0, 231, 223, 0.25)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-accent-primary)' }}>End-to-End Order Privacy</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Your limit price, quantity, side, and identity are fully encrypted.</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>Client-Side Encryption:</strong> Order terms are encrypted before leaving your browser using cryptographic commitment.</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>Confidential Matching:</strong> Executed via Flare Confidential Compute (FCC / MPC enclave)—orders are compared without revealing limits to peers or MEV bots.</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>Zero On-Chain Exposure:</strong> Unmatched orders remain 100% private. Only successful match settlements are published on Coston2 Testnet.</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>FTSOv2 Price Protection:</strong> Decentralized price feeds secure trade execution against manipulation.</div>
            </div>
          </div>

          <button
            onClick={() => setShowPrivacyModal(false)}
            style={{
              marginTop: '12px',
              padding: '12px',
              background: 'var(--color-accent-primary)',
              color: 'var(--color-bg-base)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(0, 231, 223, 0.4)'
            }}
          >
            Got it, close
          </button>
        </div>
      </Modal>

    </div>
  );
}
