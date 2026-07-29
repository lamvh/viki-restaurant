import { describe, expect, it } from 'vitest';

import {
  buildDashboard,
  deltaLabel,
  type DashboardItemRow,
  type DashboardOrderRow,
} from './dashboard-aggregate';

const NOW = new Date(2026, 6, 27, 14, 30); // Mon 27 Jul 2026, 2:30pm local

/** An order `daysAgo` days before NOW, at midday so it never straddles midnight. */
function order(daysAgo: number, total: number, status = 'completed'): DashboardOrderRow {
  const at = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - daysAgo, 12, 0);
  return { total, status, createdAt: at.toISOString() };
}

function item(itemName: string, quantity: number, lineTotal: number): DashboardItemRow {
  return { itemName, quantity, lineTotal };
}

describe('buildDashboard', () => {
  it('totals only today for the headline figures', () => {
    const result = buildDashboard([order(0, 30), order(0, 50), order(1, 100)], [], NOW);

    expect(result.todayCount).toBe(2);
    expect(result.todayRevenue).toBe(80);
    expect(result.avgOrder).toBe(40);
  });

  it('excludes unpaid and cancelled orders from sales', () => {
    const result = buildDashboard(
      [order(0, 40), order(0, 999, 'pending_payment'), order(0, 999, 'cancelled')],
      [],
      NOW,
    );

    expect(result.todayCount).toBe(1);
    expect(result.todayRevenue).toBe(40);
  });

  it('compares today against yesterday', () => {
    const result = buildDashboard([order(0, 120), order(1, 100)], [], NOW);

    expect(result.deltas.revenue).toBeCloseTo(20);
    expect(result.deltas.orders).toBeCloseTo(0);
  });

  it('reports no comparison when yesterday was empty', () => {
    const result = buildDashboard([order(0, 120)], [], NOW);

    expect(result.deltas.revenue).toBeNull();
    expect(deltaLabel(result.deltas.revenue)).toBe('no comparison yet');
  });

  it('draws seven bars ending on today', () => {
    const result = buildDashboard([order(0, 50), order(6, 10)], [], NOW);

    expect(result.chart).toHaveLength(7);
    expect(result.chart[6]).toMatchObject({ value: 50, isToday: true, day: 'Mon' });
    expect(result.chart[0]).toMatchObject({ value: 10, isToday: false, day: 'Tue' });
  });

  it('ignores orders older than the seven-day window in the chart', () => {
    // The read is already scoped to seven days; this guards the bucketing itself.
    const result = buildDashboard([order(9, 500)], [], NOW);

    expect(result.chart.every((bar) => bar.value === 0)).toBe(true);
  });

  it('counts the live queue across every fetched day, not just today', () => {
    const result = buildDashboard(
      [order(0, 10, 'new'), order(2, 10, 'new'), order(0, 10, 'ready')],
      [],
      NOW,
    );

    expect(result.queue).toEqual([
      { status: 'new', count: 2 },
      { status: 'preparing', count: 0 },
      { status: 'ready', count: 1 },
    ]);
  });

  it('counts open orders as new plus preparing', () => {
    const result = buildDashboard(
      [order(0, 10, 'new'), order(0, 10, 'preparing'), order(0, 10, 'ready')],
      [],
      NOW,
    );

    expect(result.openCount).toBe(2);
  });

  it('ranks top dishes by quantity and scales bars against the leader', () => {
    const result = buildDashboard(
      [order(0, 100)],
      [item('Phở Bò', 10, 180), item('Phở Bò', 2, 36), item('Viki Wings', 6, 84)],
      NOW,
    );

    expect(result.topDishes).toEqual([
      { rank: 1, name: 'Phở Bò', qty: 12, revenue: 216, sharePct: 100 },
      { rank: 2, name: 'Viki Wings', qty: 6, revenue: 84, sharePct: 50 },
    ]);
  });

  it('keeps at most five top dishes', () => {
    const items = Array.from({ length: 8 }, (_, i) => item(`Dish ${i}`, 8 - i, 10));
    const result = buildDashboard([order(0, 100)], items, NOW);

    expect(result.topDishes).toHaveLength(5);
    expect(result.topDishes[0].name).toBe('Dish 0');
  });

  it('returns zeroes and empty lists for an empty database', () => {
    const result = buildDashboard([], [], NOW);

    expect(result.todayRevenue).toBe(0);
    expect(result.avgOrder).toBe(0);
    expect(result.topDishes).toEqual([]);
    expect(result.chart).toHaveLength(7);
  });
});

describe('deltaLabel', () => {
  it('signs and rounds the change', () => {
    expect(deltaLabel(12.4)).toBe('+12% vs yesterday');
    expect(deltaLabel(-4.6)).toBe('−5% vs yesterday');
  });

  it('calls out an unchanged day rather than showing +0%', () => {
    expect(deltaLabel(0.2)).toBe('level with yesterday');
  });
});
