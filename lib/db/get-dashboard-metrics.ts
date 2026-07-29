import { requireStaff } from '@/lib/auth/require-role';
import { createServiceClient } from '@/lib/supabase/service-client';
import {
  buildDashboard,
  EMPTY_DASHBOARD,
  type DashboardItemRow,
  type DashboardMetrics,
  type DashboardOrderRow,
} from '@/lib/admin/dashboard-aggregate';

export type { DashboardMetrics } from '@/lib/admin/dashboard-aggregate';

/** Local midnight, `days` ago — day boundaries follow the restaurant's clock. */
function startOfDayAgo(days: number): Date {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  day.setDate(day.getDate() - days);
  return day;
}

/**
 * Staff-guarded aggregate for the Overview screen.
 *
 * Degrades to zeroes if the orders table is empty or temporarily unreadable, so
 * the dashboard always renders — a manager opening the panel mid-service should
 * never be met with an error page.
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

  // Six days back plus today gives the seven bars the chart draws.
  const windowStart = startOfDayAgo(6);
  const todayStart = startOfDayAgo(0).toISOString();

  const { data, error } = await supabase
    .from('orders')
    .select('id, total, status, created_at')
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false });

  if (error || !data) return EMPTY_DASHBOARD;

  const orders: DashboardOrderRow[] = data.map((o) => ({
    total: Number(o.total),
    status: o.status,
    createdAt: o.created_at,
  }));

  // Only today's line items are read — "Top dishes today" is the sole consumer,
  // and pulling a week of items to discard six days of them is wasted bandwidth.
  const todayOrderIds = data.filter((o) => o.created_at >= todayStart).map((o) => o.id);

  let todayItems: DashboardItemRow[] = [];
  if (todayOrderIds.length > 0) {
    const { data: itemRows } = await supabase
      .from('order_items')
      .select('item_name, quantity, line_total')
      .in('order_id', todayOrderIds);

    todayItems = (itemRows ?? []).map((row) => ({
      itemName: row.item_name,
      quantity: Number(row.quantity),
      lineTotal: Number(row.line_total),
    }));
  }

  return buildDashboard(orders, todayItems, new Date());
}
