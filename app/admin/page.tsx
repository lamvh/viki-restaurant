import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { KpiCard } from '@/components/admin/dashboard/kpi-card';
import { LiveKitchenPanel } from '@/components/admin/dashboard/live-kitchen-panel';
import { SalesChart } from '@/components/admin/dashboard/sales-chart';
import { TopDishesList } from '@/components/admin/dashboard/top-dishes-list';
import { deltaLabel } from '@/lib/admin/dashboard-aggregate';
import { money } from '@/lib/format';
import { getDashboardMetrics } from '@/lib/db/get-dashboard-metrics';

export const metadata: Metadata = { title: 'Overview' };

// Always render fresh — the dashboard reflects live order data.
export const dynamic = 'force-dynamic';

/** Direction of a percentage change, for the KPI comparison line's colour. */
function toneOf(delta: number | null): 'up' | 'down' | 'neutral' {
  if (delta === null || Math.round(delta) === 0) return 'neutral';
  return delta > 0 ? 'up' : 'down';
}

export default async function AdminOverviewPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="mx-auto max-w-[1180px]">
      <AdminPageHeader title="Overview" sub="Today at Glenfield" />

      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <KpiCard
          label="Sales today"
          value={money(metrics.todayRevenue)}
          delta={deltaLabel(metrics.deltas.revenue)}
          tone={toneOf(metrics.deltas.revenue)}
        />
        <KpiCard
          label="Orders today"
          value={String(metrics.todayCount)}
          delta={deltaLabel(metrics.deltas.orders)}
          tone={toneOf(metrics.deltas.orders)}
        />
        <KpiCard
          label="Avg order"
          value={money(metrics.avgOrder)}
          delta={deltaLabel(metrics.deltas.avgOrder)}
          tone={toneOf(metrics.deltas.avgOrder)}
        />
        {/* The design's fourth tile is loyalty points. Points are derived per
            cart and never stored, so there is nothing to report — open orders is
            the figure a manager actually acts on. */}
        <KpiCard label="Open orders" value={String(metrics.openCount)} delta="new + preparing" />
      </div>

      <div className="mb-5 grid gap-4 min-[1120px]:grid-cols-[1.6fr_1fr]">
        <SalesChart bars={metrics.chart} />
        <LiveKitchenPanel queue={metrics.queue} />
      </div>

      <TopDishesList dishes={metrics.topDishes} />
    </div>
  );
}
