import React, { useState } from 'react';
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

export default function PortfolioPage() {
  const router = useRouter();
  const [showManageModal, setShowManageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

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
          style={{ background: 'var(--color-accent-primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
        >
          Manage Vault
        </button>
      </div>

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
    
    <Modal isOpen={showManageModal} onClose={() => setShowManageModal(false)} title="Vault Operations">
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

      {activeTab === 'deposit' && <DepositForm />}
      {activeTab === 'withdraw' && <WithdrawalForm />}
    </Modal>
    </>
  );
}
