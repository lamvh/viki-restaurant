# Phase 03 — Overview dashboard

**Priority:** high
**Status:** planned

## Overview

Rebuild `/admin` as the design's Overview: four KPI cards, a 7-day sales bar
chart, a dark "Live kitchen" queue panel, and a "Top dishes today" ranking.

## Data

`getDashboardMetrics()` currently reads 50 recent orders and derives four
numbers. The design needs three more series, so the read widens to *today +
the previous 6 days* and joins line items.

```
DashboardMetrics {
  todayCount, todayRevenue, avgOrder, openCount   // existing
  deltas:  { orders, revenue, avgOrder }          // vs yesterday
  chart:   { day: 'Mon', value: number, isToday: boolean }[]   // 7 entries
  queue:   { status: 'new'|'preparing'|'ready', count: number }[]
  topItems:{ rank, name, qty, revenue, sharePct }[]            // max 5
}
```

- `pending_payment` and `cancelled` are excluded from revenue everywhere — an
  unpaid or cancelled order is neither work nor money.
- Top dishes join `order_items` for orders created today, grouped by `item_name`
  (the frozen snapshot name, so a later rename does not rewrite history).
- `sharePct` is relative to the top seller, matching the design's bar widths.
- The existing "degrade to zeroes on read failure" contract is preserved: the
  dashboard must always render.

## KPI divergence

The design's fourth KPI is "Loyalty points · 11.2k". Points are computed per
cart and never persisted, so there is nothing to read. It is replaced with
**Open orders** (`new + preparing`), which the current dashboard already shows.

## Files

- **Modify** `lib/db/get-dashboard-metrics.ts` — widen the read, add the series
- **Create** `lib/db/get-dashboard-metrics.test.ts` — pure-aggregation tests
- **Create** `components/admin/dashboard/kpi-card.tsx`
- **Create** `components/admin/dashboard/sales-chart.tsx`
- **Create** `components/admin/dashboard/live-kitchen-panel.tsx`
- **Create** `components/admin/dashboard/top-dishes-list.tsx`
- **Modify** `app/admin/page.tsx`
- **Delete** `components/admin/dashboard/metric-card.tsx`,
  `components/admin/dashboard/recent-orders-list.tsx` (superseded)

## Success criteria

- Chart bars are proportional and the current day is `--color-admin-red`.
- Empty database renders zeroes and empty states, never a crash.
- Aggregation is unit-tested independently of Supabase.
