# Phase 02 — Empty-state sweep

**Priority:** 🟠 · **Status:** not started · **New schema:** none

Per-surface audit of every list, grid and panel in the built admin. Most have an
empty state; the gaps are the ones that only appear on a fresh install or a
first-day-of-trading restaurant — exactly when a bad screen does most damage.

## Audit — surface by surface

| Surface | File | Today | Verdict |
|---|---|---|---|
| KPI tiles | `dashboard/kpi-card.tsx` | shows `$0.00` / `0` | ✅ correct |
| Sales chart | `dashboard/sales-chart.tsx` | 7 sliver bars, `Total $0.00` | ⚠️ reads as broken on a new install |
| Live kitchen | `dashboard/live-kitchen-panel.tsx` | always 3 rows (`new`/`preparing`/`ready`) | ✅ cannot be empty |
| Top dishes | `dashboard/top-dishes-list.tsx` | "Nothing sold yet today…" | ✅ correct |
| Orders list | `admin/orders/page.tsx` | "No orders in this view." | ⚠️ same copy for *no orders at all* |
| Orders detail panel | `admin/orders/page.tsx` | "Select an order to see details" | ✅ matches design |
| Menu grid | `menu/menu-screen.tsx` | 2-way: no categories / empty category | ✅ best in the codebase |
| POS tile grid | `pos/pos-tile-grid.tsx` | "No dishes match this filter." | ⚠️ same copy when the menu itself is empty |
| POS ticket (desktop) | `pos/pos-ticket-panel.tsx` | "Tap dishes to build the ticket." | ✅ matches design |
| POS ticket (mobile sheet) | same component, `compact` | reuses desktop copy | ⚠️ design says "Ticket is empty." |
| Login | `admin/login/page.tsx` | "No sign-in method is configured…" | ✅ correct |
| Receipt | `orders/[orderId]/receipt/page.tsx` | `notFound()` | ⚠️ no `not-found.tsx` to catch it (Phase 01) |

## The rule this phase establishes

Every collection surface distinguishes **three** states, never two:

1. **Nothing exists yet** — onboarding copy, and a route out ("Add your first dish").
2. **Things exist, this filter matched none** — "Nothing in this view", plus a
   clear-filter affordance.
3. **Populated.**

Conflating 1 and 2 is the defect in Orders and POS today: a brand-new restaurant
is told its *filter* is wrong.

## Files to modify

- `app/admin/orders/page.tsx` — branch on `all.length === 0` vs `orders.length === 0`.
  Filtered-empty gets a "Show all orders" link back to the default view.
- `components/admin/pos/pos-tile-grid.tsx` — branch on `allItems.length === 0`
  (menu not seeded → link to `/admin/menu`) vs filtered-empty (→ clear search /
  reset to All).
- `components/admin/pos/pos-ticket-panel.tsx` — `compact` variant uses the
  design's "Ticket is empty." copy.
- `components/admin/dashboard/sales-chart.tsx` — when `peak === 0`, replace the
  bar row with "No takings recorded in the last 7 days."
- `components/admin/menu/menu-screen.tsx` — the no-categories message names a
  seed script; keep it, but add the `+ New dish` route out so it is actionable
  even when `categories[0]` is undefined (the button is currently hidden then —
  a dead-end screen).

## Implementation steps

1. Add `components/admin/ui/empty-state.tsx` — icon slot, headline, one line of
   body, optional action. One component, so copy and spacing stop drifting.
2. Rewrite the five surfaces above against it.
3. Keep the design's exact strings where the design has one ("No orders in this
   view.", "No dishes match this filter.", "Ticket is empty.").

## Todo

- [ ] `components/admin/ui/empty-state.tsx`
- [ ] Orders — split no-data / no-match
- [ ] POS grid — split no-data / no-match
- [ ] POS ticket — compact copy
- [ ] Sales chart — all-zero week
- [ ] Menu — actionable no-categories state

## Success criteria

- Against an empty database, every admin screen states what is missing and
  offers one next step. No screen says "filter" when nothing has been seeded.
- Design strings preserved verbatim where the design specifies one.
- Lint, types, tests, build clean.

## Risks

| Risk | Mitigation |
|---|---|
| Over-designed empty states outshine the populated view | One line of body copy max; no illustrations |
| "Clear filter" links diverge from `buildHref` | Reuse the existing `buildHref` helper, do not hand-write hrefs |

## Next

Independent. Reuses nothing from Phase 01 except the admin tokens.
