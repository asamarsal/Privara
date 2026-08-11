import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { DepositForm } from '../components/DepositForm';
import { WithdrawalForm } from '../components/WithdrawalForm';
import { useRouter } from 'next/router';

export default function DepositPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  useEffect(() => {
    if (!router.isReady) return;
    setActiveTab(router.query.action === 'withdraw' ? 'withdraw' : 'deposit');
  }, [router.isReady, router.query.action]);

  const selectTab = (action: 'deposit' | 'withdraw') => {
    setActiveTab(action);
    void router.replace({ pathname: '/deposit', query: action === 'withdraw' ? { action } : {} }, undefined, { shallow: true });
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
      <Head>
        <title>Manage Assets | Privara</title>
      </Head>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <button 
          onClick={() => router.push('/portfolio')}
          style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-primary)', padding: '8px 12px', cursor: 'pointer' }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Manage Vault Assets</h1>
      </div>

      <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
          <button 
            onClick={() => selectTab('deposit')}
            style={{ 
              flex: 1, padding: '16px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '14px',
              color: activeTab === 'deposit' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === 'deposit' ? '2px solid var(--color-accent-primary)' : '2px solid transparent'
            }}
          >
            Deposit
          </button>
          <button 
            onClick={() => selectTab('withdraw')}
            style={{ 
              flex: 1, padding: '16px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '14px',
              color: activeTab === 'withdraw' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === 'withdraw' ? '2px solid var(--color-accent-primary)' : '2px solid transparent'
            }}
          >
            Withdraw
          </button>
        </div>

        <div style={{ padding: '32px 20px' }}>
          {activeTab === 'deposit' ? (
            <DepositForm />
          ) : (
            <WithdrawalForm />
          )}
        </div>
      </div>
    </div>
  );
}
