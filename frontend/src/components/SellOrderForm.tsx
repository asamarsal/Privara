import React, { useEffect, useState } from 'react';
import { useAccount, useWriteContract, usePublicClient, useSignMessage } from 'wagmi';
import { Modal } from './Modal';
import { TransactionState } from './TransactionState';
import { parseAbi, parseEther, formatEther } from 'viem';
import { useNetwork } from '../hooks/useNetwork';
import { useVaultBalance } from '../hooks/useVaultBalance';
import { OrderSide, OrderSchema, hashOrder, orderToWire, OrderType, sellMarketCollar } from '@privara/shared';
import { createNonce, createOrderId, submitOrderPayload } from '../utils/orderSubmission';
import { deployment, isAuditedV2Deployment } from '../config/deployment';
import { saveOrderToHistory } from '../hooks/useActivity';
import { useToast } from './ToastContext';
import { useFtsoPrice } from '../hooks/useFtsoPrice';
import { formatTokenAmount, orderErrorMessage } from '../utils/tokenFormatting';

const vaultAbi = parseAbi([
  'function commitOrder(bytes32 orderId, uint8 side, address tokenIn, uint256 amountIn, bytes32 encryptedCommitment, uint64 expiry)'
]);

export const SellOrderForm: React.FC<{ orderType?: string }> = ({ orderType = 'Limit' }) => {
  const { address, isConnected } = useAccount();
  const { isCorrectNetwork } = useNetwork();
  const { fxrpAvailableBalance, refetch } = useVaultBalance();
  const { addToast } = useToast();
  const { status: ftsoStatus, priceFormatted, priceBigInt } = useFtsoPrice();

  const [fxrpAmountStr, setFxrpAmountStr] = useState('');
  const [minPriceStr, setMinPriceStr] = useState('');
  const [stopPriceStr, setStopPriceStr] = useState('');
  const [expiryHours, setExpiryHours] = useState('1');
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { vault: vaultAddress, fxrp: fxrpAddress, usdt0: usdt0Address } = deployment;

  const { writeContractAsync: writeCommitOrder } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();

  const [txState, setTxState] = useState<'idle' | 'awaiting_approval' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>();
  const [txError, setTxError] = useState<string>();
  const marketPriceUnavailable = orderType === 'Market' && ftsoStatus !== 'live';

  const validateInput = (amountInput = fxrpAmountStr, priceInput = minPriceStr, stopPriceInput = stopPriceStr): { fxrpAmount: bigint, minPrice: bigint, stopPrice: bigint, orderType: OrderType } | null => {
    setError('');
    if (!amountInput) return null;
    if (orderType === 'Limit' && !priceInput) return null;
    if (orderType === 'Stop' && (!priceInput || !stopPriceInput)) return null;

    if (amountInput.toLowerCase().includes('e') || priceInput.toLowerCase().includes('e') || stopPriceInput.toLowerCase().includes('e')) {
      setError('Scientific notation is not allowed');
      return null;
    }

    try {
      const fxrpAmount = parseEther(amountInput);
      const minPrice = orderType === 'Market' ? sellMarketCollar(priceBigInt) : parseEther(priceInput);
      const stopPrice = orderType === 'Stop' ? parseEther(stopPriceInput) : 0n;
      const orderTypeEnum = orderType === 'Market' ? OrderType.market : orderType === 'Stop' ? OrderType.stop : OrderType.limit;

      if (fxrpAmount <= 0n) {
        setError('Amount must be greater than zero');
        return null;
      }
      if (orderType === 'Market' && ftsoStatus !== 'live') {
        setError('A live FTSO price is required for a market order');
        return null;
      }
      if (minPrice <= 0n) {
        setError('Price must be greater than zero');
        return null;
      }
      if (orderType === 'Stop' && stopPrice <= 0n) {
        setError('Stop price must be greater than zero');
        return null;
      }
      if (orderType === 'Stop' && minPrice > stopPrice) {
        setError('Minimum price must be less than or equal to stop price');
        return null;
      }

      if (fxrpAvailableBalance !== undefined && fxrpAvailableBalance < fxrpAmount) {
        setError(`Insufficient FXRP vault balance.`);
        return null;
      }

      return { fxrpAmount, minPrice, stopPrice, orderType: orderTypeEnum };
    } catch (err) {
      setError('Invalid amount format');
      return null;
    }
  };

  useEffect(() => {
    setStopPriceStr('');
    validateInput(fxrpAmountStr, minPriceStr, '');
  }, [orderType]);

  const estimatedProceeds = () => {
    try {
      if (!fxrpAmountStr) return '0.00';
      const fAmount = parseEther(fxrpAmountStr);
      let calcPrice = priceBigInt;
      if (orderType !== 'Market' && minPriceStr) {
        calcPrice = parseEther(minPriceStr);
      }
      const quote = (fAmount * calcPrice) / 10n ** 18n;
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
      if (!isAuditedV2Deployment) throw new Error('Writes are disabled until PrivaraVault V2 is deployed on Coston2');
      if (!isCorrectNetwork || !publicClient) throw new Error('Connect a wallet on Coston2');
      const nonce = createNonce();
      const chainId = BigInt(deployment.chainId);
      const orderId = createOrderId();

      const order = OrderSchema.parse({
        orderId,
        maker: address,
        side: OrderSide.sell,
        tokenIn: fxrpAddress,
        tokenOut: usdt0Address,
        amountIn: validated.fxrpAmount,
        limitPrice: validated.minPrice,
        orderType: validated.orderType,
        stopPrice: validated.stopPrice,
        expiry: Number(expiry),
        nonce,
        chainId: Number(chainId),
        vaultAddress
      });

      const commitment = hashOrder(order);
      const payload = JSON.stringify(orderToWire(order));
      const payloadSignature = await signMessageAsync({ message: payload });

      const commitHash = await writeCommitOrder({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'commitOrder',
        args: [
          orderId,
          1, // OrderSide.sell
          fxrpAddress, // tokenIn
          order.amountIn, // amountIn
          commitment as `0x${string}`,
          expiry
        ],
        chainId: deployment.chainId,
      });

      setTxHash(commitHash);
      setTxState('pending');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: commitHash });
      if (receipt.status !== 'success') throw new Error('Order commitment reverted');
      try {
        await submitOrderPayload(order, address, payloadSignature);
      } catch (registrationError) {
        throw new Error(`Order commitment is mined (${commitHash}), but matcher registration failed. Keep this transaction hash and retry the backend or cancel the order. ${orderErrorMessage(registrationError)}`);
      }

      // Save to localStorage for Activity History
      saveOrderToHistory({
        orderId,
        side: 1, // sell
        tokenIn: fxrpAddress,
        amountIn: order.amountIn,
        expiry: Number(expiry),
        txHash: commitHash,
        timestamp: Date.now(),
        status: 'pending'
      });

      setTxState('success');
      setFxrpAmountStr('');
      setMinPriceStr('');
      setStopPriceStr('');
      setExpiryHours('1');
      setSliderVal(0);
      setError('');
      await refetch();
    } catch (err: unknown) {
      setTxState('error');
      setTxError(orderErrorMessage(err));
    }
  };

  const [sliderVal, setSliderVal] = useState(0);

  const PCT_STEPS = [25, 50, 75, 100];
  const balanceDisplay = formatTokenAmount(fxrpAvailableBalance ?? 0n, 18, 2);

  const handlePct = (pct: number) => {
    setSliderVal(pct);
    if (fxrpAvailableBalance === undefined) return;
    try {
      const amt = (fxrpAvailableBalance * BigInt(pct)) / 100n;
      const next = formatTokenAmount(amt, 18, 18);
      setFxrpAmountStr(next);
      validateInput(next, minPriceStr);
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

      {/* Sell with */}
      <div>
        <span style={labelStyle}>Sell with</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '1.1rem' }}>🔷</span>
            <span style={{ fontWeight: 600 }}>FXRP</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>▾</span>
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Balance <span style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{balanceDisplay}</span>
            <span style={{ color: 'var(--color-text-muted)' }}> ▾</span>
          </div>
        </div>
      </div>

      {/* Amount with USDT label */}
      <div>
        <span style={labelStyle}>Amount to Sell (FXRP)</span>
        <div style={{ position: 'relative' }}>
          <input
            type="text" placeholder="0.00" value={fxrpAmountStr}
            onChange={(e) => { const value = e.target.value; setFxrpAmountStr(value); setSliderVal(0); validateInput(value, minPriceStr); }}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--color-error)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />
          <span style={{ position: 'absolute', right: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>FXRP</span>
        </div>
      </div>

      {/* Slider + Percentage buttons */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <input
          type="range" min={0} max={100} step={1} value={sliderVal}
          onChange={e => handlePct(Number(e.target.value))}
          style={{ 
            width: 'calc(100% - 16px)', 
            accentColor: 'var(--color-error)', 
            cursor: 'pointer', 
            height: '4px',
            boxSizing: 'border-box',
            margin: '8px 0',
            padding: 0
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {PCT_STEPS.map(p => (
            <button key={p} onClick={() => handlePct(p)}
              style={{ padding: '6px 0', background: sliderVal === p ? 'var(--color-error-bg)' : 'var(--color-bg-base)', border: `1px solid ${sliderVal === p ? 'var(--color-error)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', color: sliderVal === p ? 'var(--color-error)' : 'var(--color-text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-mono)', transition: 'all var(--transition-fast)' }}>
              {p}%
            </button>
          ))}
        </div>

      {orderType === 'Stop' && (
        <div>
          <span style={labelStyle}>Stop Price (USDT per FXRP)</span>
          <input
            type="text" placeholder="0.00" value={stopPriceStr}
            onChange={(e) => { const value = e.target.value; setStopPriceStr(value); validateInput(fxrpAmountStr, minPriceStr, value); }}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--color-error)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />
        </div>
      )}

      {orderType !== 'Market' && (
        <div>
          <span style={labelStyle}>Min Price (USDT per FXRP)</span>
          <input
            type="text" placeholder="0.00" value={minPriceStr}
            onChange={(e) => { const value = e.target.value; setMinPriceStr(value); validateInput(fxrpAmountStr, value); }}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--color-error)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />
        </div>
      )}

      {/* Expiry */}
      <div>
        <span style={labelStyle}>Expiry</span>
        <select value={expiryHours} onChange={e => setExpiryHours(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer', background: 'var(--color-bg-select)', color: 'var(--color-text-primary)' }}>
          <option value="1">1 Hour</option>
          <option value="6">6 Hours</option>
          <option value="24">24 Hours</option>
        </select>
      </div>

      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        V2 sells are all-or-nothing: one compatible buy must fill the entire exact FXRP amount at or above your minimum price. Partial fills are not supported.
      </div>

      {/* Estimated Proceeds */}
      <div style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Estimated Proceeds</span>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{estimatedProceeds()} USDT0</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Network Fee (Coston2)</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>Paid by wallet in Coston2 native gas token</span>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', padding: '6px var(--space-3)', background: 'var(--color-error-bg)', borderRadius: 'var(--radius-sm)' }}>{error}</div>
      )}

      {/* Place Order Button — Red for Sell */}
      <button
        onClick={() => {
          if (!isConnected) {
            addToast("Harap hubungkan wallet", "error", "top-right");
            return;
          }
          const isDisabled = !fxrpAmountStr || (orderType !== 'Market' && !minPriceStr) || (orderType === 'Stop' && !stopPriceStr) || marketPriceUnavailable || !!error || !isCorrectNetwork || txState === 'awaiting_approval' || txState === 'pending';
          if (isDisabled) {
            if (!isCorrectNetwork) addToast("Please switch to Coston2 Network", "error", "top-right");
            else if (!fxrpAmountStr || (orderType !== 'Market' && !minPriceStr)) addToast("Please enter amount and price", "error", "top-right");
            else if (orderType === 'Stop' && !stopPriceStr) addToast("Please enter stop price", "error", "top-right");
            else if (error) addToast(error, "error", "top-right");
            else addToast("Transaction in progress", "info", "top-right");
            return;
          }
          setShowConfirmModal(true);
        }}
        disabled={!isAuditedV2Deployment || txState === 'awaiting_approval' || txState === 'pending'}
        aria-disabled={(!isAuditedV2Deployment || !fxrpAmountStr || (orderType !== 'Market' && !minPriceStr) || (orderType === 'Stop' && !stopPriceStr) || marketPriceUnavailable || !!error || !isCorrectNetwork || txState === 'awaiting_approval' || txState === 'pending') ? "true" : "false"}
        className="btn-premium-sell"
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
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title={`Confirm ${orderType} Sell Order`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--color-text-primary)' }}>
          <div style={{ padding: '14px', background: 'rgba(0, 231, 223, 0.08)', border: '1px solid rgba(0, 231, 223, 0.25)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-accent-primary)' }}>Review Your Order</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Review the signed plaintext local_mock payload and on-chain hash commitment.</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>Action:</strong> Sell exactly {fxrpAmountStr || 0} FXRP, all-or-nothing</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>{orderType === 'Market' ? 'Fixed 1% FTSO collar' : 'Min Price'}:</strong> {orderType === 'Market' ? formatTokenAmount(sellMarketCollar(priceBigInt), 18, 6) : (minPriceStr || 0)} USDT0 per FXRP</div>
            </div>
            {orderType === 'Market' && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
                <div><strong>FTSO reference:</strong> {priceFormatted} USDT0 per FXRP; the collar is fixed when submitted and does not reprice automatically</div>
              </div>
            )}
            {orderType === 'Stop' && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
                <div><strong>Stop trigger:</strong> activates while FTSO is at or below {stopPriceStr || 0} USDT0 per FXRP; the trigger is level-based and not permanently latched</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>{orderType === 'Market' ? 'Est. Total Expected' : 'Total Expected'}:</strong> ~{estimatedProceeds()} USDT0</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ color: 'var(--color-accent-primary)', fontWeight: 700, flexShrink: 0 }}>✓</div>
              <div><strong>Privacy:</strong> Commitment prototype — local matcher sees signed order payload</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button onClick={() => setShowConfirmModal(false)} className="btn-premium-secondary" style={{ flex: 1, padding: '12px' }}>Cancel</button>
            <button 
              onClick={() => {
                setShowConfirmModal(false);
                handleSubmit();
              }} 
              className="btn-premium-sell" 
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
