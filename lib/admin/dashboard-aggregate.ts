import type { OrderStatus } from '@/lib/orders/order-status';

/**
 * Pure aggregation for the Overview dashboard.
 *
 * Kept separate from the Supabase read so the arithmetic — day bucketing,
 * deltas, ranking — can be tested without a database.
 */

export type DashboardOrderRow = {
  total: number;
  status: string;
  createdAt: string;
};

export type DashboardItemRow = {
  itemName: string;
  quantity: number;
  lineTotal: number;
};

export type ChartBar = { day: string; value: number; isToday: boolean };
export type QueueEntry = { status: Extract<OrderStatus, 'new' | 'preparing' | 'ready'>; count: number };
export type TopDish = { rank: number; name: string; qty: number; revenue: number; sharePct: number };

export type DashboardMetrics = {
  todayCount: number;
  todayRevenue: number;
  avgOrder: number;
  openCount: number;
  /** Percentage change vs yesterday, or null when yesterday had nothing to compare. */
  deltas: { orders: number | null; revenue: number | null; avgOrder: number | null };
  chart: ChartBar[];
  queue: QueueEntry[];
  topDishes: TopDish[];
};

/**
 * Statuses that represent neither real work nor real money.
 *
 * An order nobody has paid for has not been sold, and a cancelled one has been
 * un-sold — counting either would overstate the day's takings.
 */
const EXCLUDED_FROM_SALES = new Set(['pending_payment', 'cancelled']);

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Local midnight for a date — day boundaries follow the restaurant's clock, not UTC. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Percentage change, or null when the baseline is zero (any change is infinite). */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export const EMPTY_DASHBOARD: DashboardMetrics = {
  todayCount: 0,
  todayRevenue: 0,
  avgOrder: 0,
  openCount: 0,
  deltas: { orders: null, revenue: null, avgOrder: null },
  chart: [],
  queue: [
    { status: 'new', count: 0 },
    { status: 'preparing', count: 0 },
    { status: 'ready', count: 0 },
  ],
  topDishes: [],
};

/**
 * Builds every figure on the Overview screen.
 *
 * `orders` must already be scoped to the last seven days; `todayItems` to the
 * line items of orders created today.
 */
export function buildDashboard(
  orders: DashboardOrderRow[],
  todayItems: DashboardItemRow[],
  now: Date,
): DashboardMetrics {
  const today = startOfDay(now);
  const yesterday = addDays(today, -1);

  const sold = orders.filter((o) => !EXCLUDED_FROM_SALES.has(o.status));
  const inDay = (rows: DashboardOrderRow[], day: Date) => {
    const next = addDays(day, 1);
    return rows.filter((o) => {
      const at = new Date(o.createdAt);
      return at >= day && at < next;
    });
  };

  const todayOrders = inDay(sold, today);
  const yesterdayOrders = inDay(sold, yesterday);

  const sum = (rows: DashboardOrderRow[]) => rows.reduce((total, o) => total + o.total, 0);
  const mean = (rows: DashboardOrderRow[]) => (rows.length ? sum(rows) / rows.length : 0);

  const todayRevenue = sum(todayOrders);

  // Seven bars ending today, so the current day always sits on the right edge.
  const chart: ChartBar[] = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(today, index - 6);
    return {
      day: DAY_LABELS[day.getDay()],
      value: sum(inDay(sold, day)),
      isToday: index === 6,
    };
  });

  const queue: QueueEntry[] = (['new', 'preparing', 'ready'] as const).map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }));

  const byName = new Map<string, { qty: number; revenue: number }>();
  for (const item of todayItems) {
    const entry = byName.get(item.itemName) ?? { qty: 0, revenue: 0 };
    entry.qty += item.quantity;
    entry.revenue += item.lineTotal;
    byName.set(item.itemName, entry);
  }

  const ranked = [...byName.entries()]
    .sort((a, b) => b[1].qty - a[1].qty || a[0].localeCompare(b[0]))
    .slice(0, 5);
  // Bars are scaled against the best seller, matching the design's ranking bars.
  const topQty = ranked.length ? ranked[0][1].qty : 0;

  const topDishes: TopDish[] = ranked.map(([name, entry], index) => ({
    rank: index + 1,
    name,
    qty: entry.qty,
    revenue: entry.revenue,
    sharePct: topQty ? Math.round((entry.qty / topQty) * 100) : 0,
  }));

  return {
    todayCount: todayOrders.length,
    todayRevenue,
    avgOrder: mean(todayOrders),
    openCount: orders.filter((o) => o.status === 'new' || o.status === 'preparing').length,
    deltas: {
      orders: percentChange(todayOrders.length, yesterdayOrders.length),
      revenue: percentChange(todayRevenue, sum(yesterdayOrders)),
      avgOrder: percentChange(mean(todayOrders), mean(yesterdayOrders)),
    },
    chart,
    queue,
    topDishes,
  };
}

/** "+12% vs yesterday" / "−4% vs yesterday" / "no orders yesterday". */
export function deltaLabel(delta: number | null): string {
  if (delta === null) return 'no comparison yet';
  const rounded = Math.round(delta);
  if (rounded === 0) return 'level with yesterday';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}% vs yesterday`;
}
