import type { Metadata } from 'next';

import { MetricCard } from '@/components/admin/dashboard/metric-card';
import { RecentOrdersList } from '@/components/admin/dashboard/recent-orders-list';
import { money } from '@/lib/format';
import { getDashboardMetrics } from '@/lib/db/get-dashboard-metrics';

export const metadata: Metadata = { title: 'Dashboard' };

// Always render fresh — dashboard reflects live order data.
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-3xl">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Orders today" value={String(metrics.todayCount)} />
        <MetricCard label="Revenue today" value={money(metrics.todayRevenue)} />
        <MetricCard label="Avg order" value={money(metrics.avgOrder)} />
        <MetricCard label="Open orders" value={String(metrics.openCount)} sub="new + preparing" />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <RecentOrdersList orders={metrics.recent} />
      </section>
    </div>
  );
}
