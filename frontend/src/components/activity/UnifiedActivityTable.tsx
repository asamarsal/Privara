import React, { useState, useMemo } from 'react';
import { useActivity, OrderHistoryItem, SettlementHistoryItem } from '../../hooks/useActivity';
import { formatEther } from 'viem';
import { LottieLoader } from '../common/LottieLoader';

type FilterType = 'all' | 'orders' | 'matches' | 'settlements';

type UnifiedEvent = {
  type: 'order_submitted' | 'match_found' | 'trade_settled';
  txHash: string;
  matchId?: string;
  pair: string;
  amount: string;
  executionPrice?: string;
  ftsoPrice?: string;
  blockNumber: number;
  status: 'active' | 'matched' | 'settled' | 'cancelled';
  raw: OrderHistoryItem | SettlementHistoryItem;
};

const FXRP_ADDRESS = '0x12967a98792fc53Fb39E91d9B69917B5D32fb011';
const EXPLORER = 'https://coston2-explorer.flare.network';

const STATUS_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  active: { color: '#00b4d8', bg: 'rgba(0,180,216,0.08)', border: 'rgba(0,180,216,0.3)', label: 'Active' },
  matched: { color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.3)', label: 'Matched' },
  settled: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)', label: 'Settled' },
  cancelled: { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)', label: 'Cancelled' },
};

function renderTypeIcon(event: UnifiedEvent) {
  if (event.type === 'order_submitted') {
    const rawOrder = event.raw as OrderHistoryItem;
    if (rawOrder && rawOrder.side === 1) {
      // Red Chevron Up (Sell)
      return (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="1.2" />
          <path d="M5 9.5L8 6.5L11 9.5" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    } else {
      // Green Chevron Down (Buy)
      return (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="rgba(34, 197, 94, 0.15)" stroke="#22c55e" strokeWidth="1.2" />
          <path d="M5 6.5L8 9.5L11 6.5" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
  }
  if (event.type === 'match_found') {
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="rgba(168, 85, 247, 0.15)" stroke="#a855f7" strokeWidth="1.2" />
        <path d="M5.5 8l2 2 3-3" stroke="#a855f7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="rgba(34, 197, 94, 0.15)" stroke="#22c55e" strokeWidth="1.2" />
      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TYPE_LABELS: Record<string, string> = {
  order_submitted: 'Order Submitted',
  match_found: 'Match Found',
  trade_settled: 'Trade Settled',
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.active;
  return (
    <span style={{
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
      padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
      whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content'
    }}>
      <span className="hide-on-mobile" style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function HashLink({ hash, prefix = 'tx' }: { hash: string; prefix?: string }) {
  const url = prefix === 'tx' ? `${EXPLORER}/tx/${hash}` : `${EXPLORER}/search?q=${hash}`;
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ color: '#00b4d8', textDecoration: 'none', fontFamily: 'monospace', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
      {hash.slice(0, 6)}…{hash.slice(-4)}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 8L8 2M8 2H4M8 2v4" stroke="#00b4d8" strokeWidth="1.2" strokeLinecap="round" /></svg>
    </a>
  );
}

export const UnifiedActivityTable: React.FC = () => {
  const { orders, settlements, isLoading, error } = useActivity();
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showBanner, setShowBanner] = useState(true);

  const events: UnifiedEvent[] = useMemo(() => {
    const result: UnifiedEvent[] = [];

    // Add orders as "Order Submitted"
    orders.forEach(o => {
      const isFxrp = o.tokenIn?.toLowerCase() === FXRP_ADDRESS.toLowerCase();
      const pair = isFxrp ? 'FXRP/USDT0' : 'USDT0/FXRP';
      const amountFormatted = Number(formatEther(o.amountIn)).toLocaleString(undefined, { maximumFractionDigits: 2 });
      const tokenSymbol = isFxrp ? 'FXRP' : 'USDT0';
      result.push({
        type: 'order_submitted',
        txHash: o.txHash || o.orderId,
        pair,
        amount: `${amountFormatted} ${tokenSymbol}`,
        blockNumber: o.blockNumber,
        status: 'active',
        raw: o,
      });
    });

    // Add settlements as "Trade Settled" and inject "Match Found" for each
    settlements.forEach(s => {
      const fxrpAmt = Number(formatEther(s.fxrpAmount)).toLocaleString(undefined, { maximumFractionDigits: 2 });
      const execPrice = Number(formatEther(s.executionPrice)).toLocaleString(undefined, { maximumFractionDigits: 4 });

      result.push({
        type: 'match_found',
        txHash: s.txHash,
        matchId: s.matchId,
        pair: 'FXRP/USDT0',
        amount: `${fxrpAmt} FXRP`,
        executionPrice: `${execPrice} USDT0`,
        blockNumber: 0,
        status: 'matched',
        raw: s,
      });

      result.push({
        type: 'trade_settled',
        txHash: s.txHash,
        matchId: s.matchId,
        pair: 'FXRP/USDT0',
        amount: `${fxrpAmt} FXRP`,
        executionPrice: `${execPrice} USDT0`,
        blockNumber: 0,
        status: 'settled',
        raw: s,
      });
    });

    return result.sort((a, b) => b.blockNumber - a.blockNumber);
  }, [orders, settlements]);

  const filtered = useMemo(() => {
    if (filter === 'all') return events;
    if (filter === 'orders') return events.filter(e => e.type === 'order_submitted');
    if (filter === 'matches') return events.filter(e => e.type === 'match_found');
    if (filter === 'settlements') return events.filter(e => e.type === 'trade_settled');
    return events;
  }, [events, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleExportCSV = () => {
    const headers = ['Type', 'Tx Hash', 'Match ID', 'Pair', 'Amount', 'Execution Price', 'Block', 'Status'];
    const rows = filtered.map(e => [
      TYPE_LABELS[e.type], e.txHash, e.matchId || '—', e.pair, e.amount, e.executionPrice || '—', e.blockNumber, e.status
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'activity.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const FILTERS: { key: FilterType; label: string; icon: JSX.Element }[] = [
    {
      key: 'all',
      label: 'All',
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    },
    {
      key: 'orders',
      label: 'Orders',
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    },
    {
      key: 'matches',
      label: 'Matches',
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 8c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5-5-2.24-5-5z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    },
    {
      key: 'settlements',
      label: 'Settlements',
      icon: (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
  ];

  const TAB_COUNTS: Record<FilterType, number> = {
    all: events.length,
    orders: events.filter(e => e.type === 'order_submitted').length,
    matches: events.filter(e => e.type === 'match_found').length,
    settlements: events.filter(e => e.type === 'trade_settled').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Privacy Banner */}
      {showBanner && (
        <div style={{
          background: 'rgba(0, 180, 216, 0.08)',
          border: '1px solid rgba(0, 180, 216, 0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke="#60a5fa" strokeWidth="1.5" />
              <path d="M9 9v4M9 6h.01" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ color: '#93c5fd', fontSize: '13px' }}>
              Completed trades reveal settlement details on-chain; unmatched order terms remain confidential.
            </span>
          </div>
          <button onClick={() => setShowBanner(false)}
            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '16px', padding: 0 }}>
            ×
          </button>
        </div>
      )}

      {/* Table Card */}
      <div style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)', borderRadius: '16px', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', flex: 1, paddingBottom: '2px' }}>
            {FILTERS.map(f => {
              const isActive = filter === f.key;
              return (
                <button key={f.key} onClick={() => { setFilter(f.key); setPage(1); }}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '13px', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: isActive ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#fff' : 'var(--color-text-secondary)',
                    whiteSpace: 'nowrap'
                  }}>
                  {f.icon}
                  <span className={isActive ? '' : 'hide-on-mobile'}>{f.label}</span>
                  {TAB_COUNTS[f.key] > 0 && (
                    <span style={{ marginLeft: '2px', background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0 5px', fontSize: '11px' }}>
                      {TAB_COUNTS[f.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Actions - Desktop Only */}
          <div className="hide-on-mobile">
            <button onClick={handleExportCSV} title="Export CSV"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M4 6l3 3 3-3M2 10v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', minHeight: '400px' }}>
          {isLoading ? (
            <LottieLoader size={80} text="Loading activity..." />
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-error)', fontSize: '13px' }}>{error}</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              No {filter === 'all' ? '' : filter} activity found.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Type', 'Tx Hash', 'Match ID', 'Pair', 'Amount', 'Execution Price', 'Block', 'Status'].map(h => (
                    <th key={h} className={['Tx Hash', 'Match ID', 'Execution Price', 'Block'].includes(h) ? 'hide-on-mobile' : ''} style={{ padding: '10px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((event, i) => (
                  <tr key={i}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Type */}
                    <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {renderTypeIcon(event)}
                        <span className="hide-on-mobile" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {TYPE_LABELS[event.type]}
                        </span>
                      </div>
                    </td>
                    {/* Tx Hash */}
                    <td className="hide-on-mobile" style={{ padding: '12px 16px' }}>
                      {event.txHash && event.txHash.startsWith('0x') ? (
                        <HashLink hash={event.txHash} />
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    {/* Match ID */}
                    <td className="hide-on-mobile" style={{ padding: '12px 16px' }}>
                      {event.matchId ? (
                        <HashLink hash={event.matchId} prefix="match" />
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    {/* Pair */}
                    <td style={{ padding: '12px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                      {event.pair}
                    </td>
                    {/* Amount */}
                    <td style={{ padding: '12px 8px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                      {event.amount}
                    </td>
                    {/* Execution Price */}
                    <td className="hide-on-mobile" style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                      {event.executionPrice || '—'}
                    </td>
                    {/* Block */}
                    <td className="hide-on-mobile" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {event.blockNumber > 0 ? `#${event.blockNumber.toLocaleString()}` : '—'}
                    </td>
                    {/* Status */}
                    <td style={{ padding: '12px 8px' }}>
                      <StatusBadge status={event.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Showing {Math.min((page - 1) * rowsPerPage + 1, filtered.length)} to {Math.min(page * rowsPerPage, filtered.length)} of {filtered.length} results
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                ‹
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--color-border)', background: page === p ? 'var(--color-accent-primary)' : 'transparent', color: page === p ? '#fff' : 'var(--color-text-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: page === p ? 700 : 400 }}>
                  {p}
                </button>
              ))}

              {totalPages > 5 && <span style={{ color: 'var(--color-text-muted)' }}>…</span>}

              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                ›
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <span className="hide-on-mobile">Rows per page</span>
                <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                  style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text-primary)', padding: '3px 8px', fontSize: '13px', cursor: 'pointer' }}>
                  {[5, 10, 25].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Export CSV Button - Mobile Only */}
              <button onClick={handleExportCSV} title="Export CSV" className="show-on-mobile"
                style={{ alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, marginLeft: 'auto' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 6l3 3 3-3M2 10v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
