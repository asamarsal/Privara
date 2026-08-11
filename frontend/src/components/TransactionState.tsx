import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { deployment } from '../config/deployment';

export type StateType = 'idle' | 'awaiting_approval' | 'pending' | 'success' | 'error';

interface Props {
  state: StateType;
  txHash?: string;
  errorMessage?: string;
}

export const TransactionState: React.FC<Props> = ({ state, txHash, errorMessage }) => {
  const [closed, setClosed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setClosed(false);
  }, [state, txHash, errorMessage]);

  if (!mounted || state === 'idle' || closed) return null;

  const explorerUrl = deployment.explorerUrl;
  const txLink = txHash ? `${explorerUrl}/tx/${txHash}` : undefined;

  return createPortal(
    <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 100000, padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-border)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', minWidth: '320px', maxWidth: '400px', wordBreak: 'break-word', animation: 'slideInRight 0.3s ease-out', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div style={{ flex: 1 }}>
      {state === 'awaiting_approval' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div className="spinner" />
          <span>Waiting for wallet confirmation...</span>
        </div>
      )}

      {state === 'pending' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div className="spinner" />
          <span>
            Transaction submitted. Waiting for confirmation...
            {txLink && <a href={txLink} target="_blank" rel="noreferrer" style={{ display: 'block', color: 'var(--color-accent-primary)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>View on Explorer</a>}
          </span>
        </div>
      )}

      {state === 'success' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', color: 'var(--color-success)' }}>
          <span style={{ fontSize: '1.5rem' }}>✓</span>
          <span>
            Transaction confirmed.
            {txLink && <a href={txLink} target="_blank" rel="noreferrer" style={{ display: 'block', color: 'var(--color-accent-primary)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>View on Explorer</a>}
          </span>
        </div>
      )}

      {state === 'error' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', color: 'var(--color-error)' }}>
          <span style={{ fontSize: '1.5rem' }}>✗</span>
          <span>{errorMessage || 'Transaction failed.'}</span>
        </div>
      )}
      </div>
      <button 
        onClick={() => setClosed(true)} 
        style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.2rem', cursor: 'pointer', padding: '0', lineHeight: 1, flexShrink: 0 }}
        aria-label="Close"
      >
        ✕
      </button>
    </div>,
    document.body
  );
};
