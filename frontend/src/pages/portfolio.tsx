import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { TopMetrics } from '../components/portfolio/TopMetrics';
import { VaultHoldings } from '../components/portfolio/VaultHoldings';
import { OrdersTable } from '../components/portfolio/OrdersTable';
import { HistoryTable } from '../components/portfolio/HistoryTable';
import { PortfolioHealth } from '../components/portfolio/PortfolioHealth';
import { PrivacyStatus } from '../components/portfolio/PrivacyStatus';
import { ActivityFeed } from '../components/portfolio/ActivityFeed';
import { Modal } from '../components/Modal';
import { DepositForm } from '../components/DepositForm';
import { WithdrawalForm } from '../components/WithdrawalForm';
import { useAccount } from 'wagmi';
import { useActivity } from '../hooks/useActivity';

export default function PortfolioPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [showManageModal, setShowManageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const { error: portfolioError, refresh, freshness } = useActivity();
  const tokenQuery = Array.isArray(router.query.token) ? router.query.token[0] : router.query.token;
  const normalizedToken = tokenQuery?.toUpperCase();
  const requestedToken = normalizedToken === 'USDT0' ? 'USDT0' : 'FXRP';
  const actionQuery = Array.isArray(router.query.action) ? router.query.action[0] : router.query.action;

  useEffect(() => {
    if (!router.isReady) return;
    if (actionQuery === 'deposit' || actionQuery === 'withdraw') {
      setActiveTab(actionQuery);
      setShowManageModal(true);
    }
  }, [router.isReady, actionQuery, tokenQuery]);

  const closeManageModal = () => {
    setShowManageModal(false);
    if (router.query.action || router.query.token) {
      void router.replace('/portfolio', undefined, { shallow: true });
    }
  };

  return (
    <>
      <div className="page-container">
      <Head>
        <title>Portfolio Dashboard | Privara</title>
      </Head>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title-responsive" style={{ margin: 0 }}>Dashboard</h1>
        <button 
          onClick={() => setShowManageModal(true)}
          className="btn-premium-primary"
        >
          Manage Vault
        </button>
      </div>

      {!isConnected && (
        <div role="status" style={{ marginBottom: '16px', padding: '12px 16px', border: '1px solid var(--color-warning)', borderRadius: '10px', background: 'var(--color-warning-bg)', color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Wallet not connected.</strong>{' '}
          You can explore the Portfolio dashboard and vault forms in read-only mode. Connect a wallet on Coston2 to load account-specific balances, orders, history, and submit deposit or withdrawal transactions.
        </div>
      )}

      {portfolioError && (
        <div role="alert" style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--color-error)', background: 'var(--color-error-bg)', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
          <span>Portfolio indexer unavailable: {portfolioError}. Indexed orders and metrics are unknown, not zero.</span>
          <button type="button" className="btn-premium-secondary" onClick={() => void refresh()} style={{ padding: '8px 12px', flexShrink: 0 }}>Retry</button>
        </div>
      )}
      {freshness?.indexedBlock !== undefined && (
        <div style={{ marginBottom: '12px', color: 'var(--color-text-muted)', fontSize: '11px' }}>Indexer data through block {freshness.indexedBlock}</div>
      )}

      <TopMetrics />

      <div className="layout-portfolio">
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <VaultHoldings />
        </div>

        {/* Middle Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <OrdersTable />
          <HistoryTable />
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <PortfolioHealth />
          <PrivacyStatus />
          <ActivityFeed />
        </div>

      </div>
    </div>
    
    <Modal isOpen={showManageModal} onClose={closeManageModal} title="Vault Operations">
      <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('deposit')}
          style={{ 
            flex: 1, 
            padding: '10px 16px', 
            borderRadius: '8px', 
            border: 'none', 
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            background: activeTab === 'deposit' ? 'var(--color-accent-primary)' : 'transparent',
            color: activeTab === 'deposit' ? '#fff' : 'var(--color-text-secondary)',
            transition: 'all 0.2s ease'
          }}
        >
          Deposit
        </button>
        <button 
          onClick={() => setActiveTab('withdraw')}
          style={{ 
            flex: 1, 
            padding: '10px 16px', 
            borderRadius: '8px', 
            border: 'none', 
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            background: activeTab === 'withdraw' ? 'var(--color-accent-primary)' : 'transparent',
            color: activeTab === 'withdraw' ? '#fff' : 'var(--color-text-secondary)',
            transition: 'all 0.2s ease'
          }}
        >
          Withdraw
        </button>
      </div>

      {activeTab === 'deposit' && <DepositForm initialToken={requestedToken} />}
      {activeTab === 'withdraw' && <WithdrawalForm initialToken={requestedToken} />}
    </Modal>
    </>
  );
}
