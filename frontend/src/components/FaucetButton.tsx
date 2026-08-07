import React, { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { parseAbi, parseEther } from 'viem';
import { useNetwork } from '../hooks/useNetwork';

const erc20Abi = parseAbi(['function mint(address to, uint256 amount) external']);

const TOKENS = [
  { symbol: 'fXRP', address: '0x12967a98792fc53Fb39E91d9B69917B5D32fb011' },
  { symbol: 'USDT', address: '0xDC7E830282489f5e461C4bfC0deE292fD9591C86' }
];

const PRESET_AMOUNTS = ['1000', '5000', '10000'];

interface ToastState {
  title: string;
  message: string;
  type: 'success' | 'error';
  txHash?: string;
}

export const FaucetButton: React.FC = () => {
  const { address } = useAccount();
  const { isCorrectNetwork } = useNetwork();
  const { writeContractAsync } = useWriteContract();
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState(TOKENS[0].address);
  const [amount, setAmount] = useState(PRESET_AMOUNTS[2]); // Default 10000
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (title: string, message: string, type: 'success' | 'error', txHash?: string) => {
    setToast({ title, message, type, txHash });
    setTimeout(() => {
      setToast(null);
    }, 8000);
  };

  const handleMint = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const mintAmount = parseEther(amount);
      const tokenObj = TOKENS.find(t => t.address.toLowerCase() === selectedToken.toLowerCase()) || TOKENS[0];

      const txHash = await writeContractAsync({
        address: selectedToken as `0x${string}`,
        abi: erc20Abi,
        functionName: 'mint',
        args: [address, mintAmount]
      });

      showToast(
        'Faucet Requested', 
        `Successfully requested ${amount} ${tokenObj.symbol}!`,
        'success',
        txHash
      );
      setIsOpen(false);
    } catch (err: any) {
      showToast(
        'Claim Failed',
        err.message || 'An error occurred during minting.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!address || !isCorrectNetwork) return null;

  return (
    <div style={{ position: 'relative', height: '36px' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        disabled={loading}
        className={loading ? "btn-premium-secondary" : "btn-premium-primary"}
        style={{ 
          padding: '0 1rem', 
          fontSize: '14px', 
          height: '36px',
          boxSizing: 'border-box'
        }}
      >
        {loading ? 'Minting...' : 'Claim Faucet'}
      </button>

      {/* DROPDOWN DIALOG (THEMED) */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          right: 0,
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-dropdown)', 
          borderRadius: '12px',
          padding: '24px',
          width: '320px',
          zIndex: 1000,
          boxSizing: 'border-box',
          color: 'var(--color-text-primary)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Claim Testnet Tokens</h3>
            <span style={{ cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }} onClick={() => setIsOpen(false)}>✕</span>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)' }}>Asset</label>
            <select 
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--color-bg-select)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: '6px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontWeight: 600
              }}
            >
              {TOKENS.map(t => (
                <option key={t.address} value={t.address} style={{ background: 'var(--color-bg-select)', color: 'var(--color-text-primary)' }}>{t.symbol}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)' }}>Amount</label>
            <select 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--color-bg-select)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: '6px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontWeight: 600
              }}
            >
              {PRESET_AMOUNTS.map(amt => (
                <option key={amt} value={amt} style={{ background: 'var(--color-bg-select)', color: 'var(--color-text-primary)' }}>{amt}</option>
              ))}
            </select>
          </div>

          <button 
            className="btn-premium-primary"
            onClick={handleMint}
            disabled={loading || !amount}
            style={{
              width: '100%',
              padding: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {loading ? 'Minting...' : 'Mint Now'}
          </button>
        </div>
      )}

      {/* TOP RIGHT TOAST NOTIFICATION (THEMED) */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          background: 'var(--color-bg-surface)',
          border: `1px solid ${toast.type === 'success' ? 'var(--color-accent-primary)' : 'var(--color-error)'}`,
          borderRadius: '10px',
          padding: '16px 20px',
          maxWidth: '380px',
          boxShadow: 'var(--shadow-dropdown)',
          color: 'var(--color-text-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: toast.type === 'success' ? 'var(--color-accent-primary)' : 'var(--color-error)' }}>
              <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
              <span>{toast.title}</span>
            </div>
            <span style={{ cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-muted)', marginLeft: '12px' }} onClick={() => setToast(null)}>✕</span>
          </div>

          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            {toast.message}
          </p>

          {toast.txHash && (
            <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--color-border)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                Tx: {toast.txHash.slice(0, 8)}...{toast.txHash.slice(-6)}
              </span>
              <a 
                href={`https://coston2-explorer.flare.network/tx/${toast.txHash}`} 
                target="_blank" 
                rel="noreferrer"
                style={{ color: 'var(--color-accent-primary)', textDecoration: 'none', fontWeight: 600 }}
              >
                Explorer ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
