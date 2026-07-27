import { requireStaff } from '@/lib/auth/require-role';
import { createServiceClient } from '@/lib/supabase/service-client';

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export type RecentOrder = {
  id: string;
  service: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
};

export type DashboardMetrics = {
  todayCount: number;
  todayRevenue: number;
  avgOrder: number;
  openCount: number;
  recent: RecentOrder[];
};

const EMPTY: DashboardMetrics = {
  todayCount: 0,
  todayRevenue: 0,
  avgOrder: 0,
  openCount: 0,
  recent: [],
};

function startOfToday(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

/**
 * Staff-guarded dashboard aggregate read from `orders`. Degrades to zeroes if
 * the orders table has no rows yet or is temporarily unreadable, so the
 * dashboard always renders.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await requireStaff();

  // Reads go through the service-role client, not the RLS-bound one.
  //
  // Authorisation is enforced above by `requireStaff()`. The RLS policy on
  // `orders` requires `auth.role() = 'authenticated'`, which only holds for a
  // Supabase Auth session — the admin password login (lib/auth/admin-session.ts)
  // is not one, so an RLS-bound read silently returns zero rows for a perfectly
  // valid staff user.
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .select('id, service, total, status, created_at')
    // Orders still awaiting payment are not real work and not real revenue.
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return EMPTY;

  const since = startOfToday();
  const today = data.filter((o) => o.created_at >= since);
  const todayRevenue = today.reduce((sum, o) => sum + Number(o.total), 0);
  const openCount = data.filter(
    (o) => o.status === 'new' || o.status === 'preparing',
  ).length;

  return {
    todayCount: today.length,
    todayRevenue,
    avgOrder: today.length > 0 ? todayRevenue / today.length : 0,
    openCount,
    recent: data.slice(0, 8).map((o) => ({
      id: o.id,
      service: o.service,
      total: Number(o.total),
      status: o.status as OrderStatus,
      createdAt: o.created_at,
    })),
  };
}
