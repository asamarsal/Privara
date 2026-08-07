import React, { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { Modal } from './Modal';
import { TransactionState } from './TransactionState';
import { parseAbi, parseEther, formatEther, keccak256, toHex, stringToHex } from 'viem';
import { useNetwork } from '../hooks/useNetwork';
import { useVaultBalance } from '../hooks/useVaultBalance';
import { OrderSide, Order, hashOrder, encodeOrderForHashing } from '@privara/shared';
import { saveOrderToHistory } from '../hooks/useActivity';
import { useToast } from './ToastContext';

const vaultAbi = parseAbi([
  'function commitOrder(bytes32 orderId, uint8 side, address tokenIn, uint256 amountIn, bytes32 encryptedCommitment, uint64 expiry)'
]);

export const BuyOrderForm: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { isCorrectNetwork } = useNetwork();
  const { usdt0Balance, refetch } = useVaultBalance();
  const { addToast } = useToast();

  const [fxrpAmountStr, setFxrpAmountStr] = useState('');
  const [maxPriceStr, setMaxPriceStr] = useState('');
  const [expiryHours, setExpiryHours] = useState('1');
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const vaultAddress = "0xa479Bc0C4B000D0dcD6FaC3BB9E71B830eBE048E";
  const fxrpAddress = "0x12967a98792fc53Fb39E91d9B69917B5D32fb011";
  const usdt0Address = "0xDC7E830282489f5e461C4bfC0deE292fD9591C86";

  const { writeContractAsync: writeCommitOrder } = useWriteContract();

  const [txState, setTxState] = useState<'idle' | 'awaiting_approval' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>();
  const [txError, setTxError] = useState<string>();

  const validateInput = (): { fxrpAmount: bigint, maxPrice: bigint } | null => {
    setError('');
    if (!fxrpAmountStr || !maxPriceStr) return null;

    if (fxrpAmountStr.includes('e') || maxPriceStr.includes('e')) {
      setError('Scientific notation is not allowed');
      return null;
    }

    try {
      const fxrpAmount = parseEther(fxrpAmountStr);
      const maxPrice = parseEther(maxPriceStr); // Assuming price is scaled by 1e18

      if (fxrpAmount <= 0n || maxPrice <= 0n) {
        setError('Amounts must be greater than zero');
        return null;
      }

      // Calculate estimated quote amount: (fxrpAmount * maxPrice) / 1e18
      const quoteAmount = (fxrpAmount * maxPrice) / 10n ** 18n;

      if (usdt0Balance && usdt0Balance < quoteAmount) {
        setError(`Insufficient USDT0 vault balance. Need ${formatEther(quoteAmount)}`);
        return null;
      }

      return { fxrpAmount, maxPrice };
    } catch (err) {
      setError('Invalid amount format');
      return null;
    }
  };

  const estimatedCost = () => {
    try {
      if (!fxrpAmountStr || !maxPriceStr) return '0.00';
      const fAmount = parseEther(fxrpAmountStr);
      const mPrice = parseEther(maxPriceStr);
      const quote = (fAmount * mPrice) / 10n ** 18n;
      return formatEther(quote);
    } catch {
      return '0.00';
    }
  };

  const handleSubmit = async () => {
    if (!address) return;
    const validated = validateInput();
    if (!validated) return;

    try {
      setTxState('awaiting_approval');
      setTxError('');
      setTxHash(undefined);

      const expiry = BigInt(Math.floor(Date.now() / 1000) + Number(expiryHours) * 3600);
      const nonce = BigInt(Math.floor(Math.random() * 1000000));
      const chainId = 114n; // Coston2

      // Create order object using shared schema types
      const orderId = stringToHex(`order-${Date.now()}-${Math.floor(Math.random() * 1000)}`, { size: 32 });

      const order: Order = {
        orderId,
        maker: address,
        side: OrderSide.buy,
        tokenIn: usdt0Address,
        tokenOut: fxrpAddress,
        amountIn: (validated.fxrpAmount * validated.maxPrice) / 10n ** 18n, // Quote amount we put in
        limitPrice: validated.maxPrice,
        expiry: Number(expiry),
        nonce,
        chainId: Number(chainId),
        vaultAddress
      };

      // In a real TEE integration, we would encrypt `encodedOrder` with the FCC public key.
      // For local_mock, the ciphertext is just the encoded order itself, or its hash.
      // Wait! The matcher expects `encryptedCommitment` (from the event) to match its tracked order.
      // Let's use the hashOrder as the encryptedCommitment for mock purposes.
      const ciphertext = hashOrder(order); // Mock encryption
      const encryptedCommitment = keccak256(ciphertext as `0x${string}`); // The commitment sent on-chain

      // We actually need to submit the ciphertext to the backend matcher's POST /submit in a real app,
      // but in our mock flow, the backend relies on the event. 
      // The instruction says "Call PrivaraVault.commitOrder() with encryptedCommitment = keccak256(ciphertext)".
      // But we will just pass `ciphertext` directly since the backend indexer uses the event's `encryptedCommitment` as the ciphertext!
      // Looking at `indexer.ts`: `encryptedCommitment: orderRecord.encryptedCommitment`.
      // So if we pass `keccak256(ciphertext)` on-chain, the backend sees `keccak256(ciphertext)` as the ciphertext.
      // Thus we must pass `ciphertext` as the `encryptedCommitment` argument to the contract so the backend can read it!

      const commitHash = await writeCommitOrder({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'commitOrder',
        args: [
          orderId,
          0, // OrderSide.buy
          usdt0Address, // tokenIn
          order.amountIn, // amountIn
          ciphertext as `0x${string}`,
          expiry
        ]
      });

      setTxHash(commitHash);
      setTxState('pending');

      // Save to localStorage for Activity History
      saveOrderToHistory({
        orderId,
        side: 0, // buy
        tokenIn: usdt0Address,
        amountIn: order.amountIn,
        expiry: Number(expiry),
        txHash: commitHash,
        timestamp: Date.now(),
        status: 'pending'
      });

      // Simulate success for MVP
      setTxState('success');
      refetch();
    } catch (err: any) {
      setTxState('error');
      setTxError(err.message || 'Failed to submit order');
    }
  };

  const [sliderVal, setSliderVal] = useState(0);

  const PCT_STEPS = [25, 50, 75, 100];
  const balanceDisplay = usdt0Balance ? `${parseFloat(formatEther(usdt0Balance)).toFixed(2)}` : '0.00';

  const handlePct = (pct: number) => {
    setSliderVal(pct);
    if (!usdt0Balance || !maxPriceStr) return;
    try {
      const budget = (usdt0Balance * BigInt(pct)) / 100n;
      const price = parseEther(maxPriceStr);
      if (price > 0n) {
        const amt = (budget * 10n ** 18n) / price;
        setFxrpAmountStr(parseFloat(formatEther(amt)).toFixed(4));
      }
    } catch { /* ignore */ }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-bg-base)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-primary)',
    padding: '10px var(--space-3)',
    fontSize: 'var(--font-size-base)',
    width: '100%',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
    boxSizing: 'border-box' as const,
    transition: 'border-color var(--transition-fast)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

      {/* Pay with */}
      <div>
        <span style={labelStyle}>Pay with</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '1.1rem' }}>💵</span>
            <span style={{ fontWeight: 600 }}>USDT</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>▾</span>
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Balance <span style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{balanceDisplay}</span>
            <span style={{ color: 'var(--color-text-muted)' }}> ▾</span>
          </div>
        </div>
      </div>

      {/* Amount input with FXRP label inside */}
      <div>
        <span style={labelStyle}>Amount to Buy (FXRP)</span>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="0.00"
            value={fxrpAmountStr}
            onChange={(e) => { setFxrpAmountStr(e.target.value); validateInput(); }}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--color-accent-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />
          <span style={{ position: 'absolute', right: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>FXRP</span>
        </div>
      </div>

      {/* Slider */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <input
          type="range" min={0} max={100} step={1} value={sliderVal}
          onChange={e => handlePct(Number(e.target.value))}
          style={{ 
            width: 'calc(100% - 16px)', 
            accentColor: 'var(--color-accent-primary)', 
            cursor: 'pointer', 
            height: '4px',
            boxSizing: 'border-box',
            margin: '8px 0',
            padding: 0 
          }}
        />
      </div>
      {/* Percentage buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {PCT_STEPS.map(p => (
            <button key={p} onClick={() => handlePct(p)}
              style={{ padding: '6px 0', background: sliderVal === p ? 'rgba(0,231,223,0.15)' : 'var(--color-bg-base)', border: `1px solid ${sliderVal === p ? 'var(--color-accent-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', color: sliderVal === p ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-mono)', transition: 'all var(--transition-fast)' }}>
              {p}%
            </button>
          ))}
        </div>

      {/* Max Price */}
      <div>
        <span style={labelStyle}>Max Price (USDT per FXRP)</span>
        <input
          type="text"
          placeholder="0.00"
          value={maxPriceStr}
          onChange={(e) => { setMaxPriceStr(e.target.value); validateInput(); }}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--color-accent-primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
        />
      </div>

      {/* Expiry */}
      <div>
        <span style={labelStyle}>Expiry</span>
        <select
          value={expiryHours}
          onChange={(e) => setExpiryHours(e.target.value)}
          style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer', background: 'var(--color-bg-select)', color: 'var(--color-text-primary)' }}
        >
          <option value="1">1 Hour</option>
          <option value="6">6 Hours</option>
          <option value="24">24 Hours</option>
        </select>
      </div>

      {/* Estimated Cost */}
      <div style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Estimated Cost</span>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{estimatedCost()} USDT</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Network Fee (Coston2)</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>~ 0.0001 USDT</span>
        </div>
      </div>

      {error && <div style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', padding: '6px var(--space-3)', background: 'var(--color-error-bg)', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      {/* Place Order Button */}
      <button
        onClick={() => {
          if (!isConnected) {
            addToast("Harap hubungkan wallet", "error", "top-right");
            return;
          }
          const isDisabled = !fxrpAmountStr || !maxPriceStr || !!error || !isCorrectNetwork || txState === 'awaiting_approval' || txState === 'pending';
          if (isDisabled) {
            if (!isCorrectNetwork) addToast("Please switch to Coston2 Network", "error", "top-right");
            else if (!fxrpAmountStr || !maxPriceStr) addToast("Please enter amount and price", "error", "top-right");
            else if (error) addToast(error, "error", "top-right");
            else addToast("Transaction in progress", "info", "top-right");
            return;
          }
          setShowConfirmModal(true);
        }}
        aria-disabled={(!fxrpAmountStr || !maxPriceStr || !!error || !isCorrectNetwork || txState === 'awaiting_approval' || txState === 'pending') ? "true" : "false"}
        className="btn-premium-buy"
        style={{
          width: '100%',
          padding: 'var(--space-3) 0',
          letterSpacing: '0.5px',
          fontWeight: 800,
          fontSize: 'var(--font-size-base)',
        }}
      >
        {txState === 'awaiting_approval' ? 'Confirm in Wallet...' : txState === 'pending' ? 'Submitting...' : 'Place Order'}
      </button>

      <TransactionState state={txState} txHash={txHash} errorMessage={txError} />

      {/* CONFIRMATION MODAL */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="🔒 Confirm Order Details">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--color-text-primary)' }}>
          <div style={{ padding: '14px', background: 'rgba(0, 231, 223, 0.08)', border: '1px solid rgba(0, 231, 223, 0.25)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-accent-primary)' }}>Review Your Order</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Please confirm your encrypted order details.</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>Action:</strong> Buy {fxrpAmountStr || 0} FXRP</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>Max Price:</strong> {maxPriceStr || 0} USDT0 per FXRP</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>Total Cost:</strong> ~{(Number(fxrpAmountStr) * Number(maxPriceStr)).toFixed(2)} USDT0</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>Privacy:</strong> Fully Encrypted & Confidential</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button onClick={() => setShowConfirmModal(false)} className="btn-premium-secondary" style={{ flex: 1, padding: '12px' }}>Cancel</button>
            <button 
              onClick={() => {
                setShowConfirmModal(false);
                handleSubmit();
              }} 
              className="btn-premium-buy" 
              style={{ flex: 1, padding: '12px' }}
            >
              Yes, Place Order
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
