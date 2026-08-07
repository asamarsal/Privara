import React from 'react';
import Head from 'next/head';
import { UnifiedActivityTable } from '../components/activity/UnifiedActivityTable';
import { ActivitySummaryCard } from '../components/activity/ActivitySummaryCard';
import { LatestSettlementCard } from '../components/activity/LatestSettlementCard';
import { ExplorerLinksCard } from '../components/activity/ExplorerLinksCard';

export default function ActivityPage() {
  return (
    <div className="page-container">
      <Head>
        <title>Activity &amp; Settlements | Privara</title>
        <meta name="description" content="View your complete trading activity, order history, matches and settlements on Privara." />
      </Head>

      {/* Main Grid: Table (left) + Sidebar (right) */}
      <div className="layout-activity">
        {/* Left Column: Title + Unified Activity Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h1 className="page-title-responsive" style={{ marginBottom: 0 }}>
            Activity &amp; Settlements
          </h1>
          <UnifiedActivityTable />
        </div>

        {/* Right: Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ActivitySummaryCard />
          <LatestSettlementCard />
          <ExplorerLinksCard />
        </div>
      </div>
    </div>
  );
}
