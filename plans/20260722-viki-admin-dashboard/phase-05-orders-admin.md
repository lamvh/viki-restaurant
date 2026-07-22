# Phase 05 — Orders Admin

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-22-viki-admin-design.md](../../docs/superpowers/specs/2026-07-22-viki-admin-design.md) (§9 orders, §6 roles, §5 orders schema)
- Depends on: 03 (`lib/db` order helpers), 04 (admin shell)
- Unblocks: — (independent surface)

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** `/admin/orders` — orders table with status filter, row → detail view, and a status-transition control. Both admin and staff can view and change status (spec §6).

## Key Insights
- Status set is fixed by DB check (spec §5): `new|preparing|ready|completed|cancelled`. UI transitions must stay within this set; server validates.
- Both roles get full orders access (spec §6) — only `requireStaff()` needed, no admin gate here.
- Order detail must show the frozen `order_items` snapshot (name, unit_price, qty, options, line_total) — NOT a live menu lookup (prices may have changed).
- Status change is a server action calling `updateOrderStatus` (Phase 03) → `revalidatePath('/admin/orders')`.

## Requirements
**Functional**
- `/admin/orders`: table (number, time, service, customer, total, status badge) with status filter.
- Row/detail: full order incl. line items snapshot + customer + note.
- Status control: change to any allowed status; persists; reflects immediately.

**Non-functional**
- Server components for lists; client only for filter + status control.
- Files < 200 lines.

## Architecture
- **List flow:** `admin/orders/page.tsx` (server, reads `searchParams.status`) → `listOrders({status})` → table.
- **Detail flow:** `admin/orders/[id]/page.tsx` (server) → `getOrder(id)` → detail + status control.
- **Mutation:** `StatusControl` (client) → server action `update-order-status.ts` → `requireStaff()` → `lib/db.updateOrderStatus` → `revalidatePath`.

## Related Code Files
**Create**
- `app/admin/orders/page.tsx` (list + filter)
- `app/admin/orders/[id]/page.tsx` (detail)
- `app/admin/orders/actions.ts` (`updateStatusAction`, `requireStaff`)
- `components/admin/orders/orders-table.tsx`
- `components/admin/orders/order-status-badge.tsx`
- `components/admin/orders/order-status-control.tsx` (`'use client'`)
- `components/admin/orders/order-status-filter.tsx` (`'use client'`)
- `components/admin/orders/order-detail.tsx`
- `lib/orders/order-status.ts` (status constants + labels + allowed set)

**Modify**
- `lib/db/list-orders.ts` (accept status filter param — if not already in 03)

**Delete:** none

## Implementation Steps
1. `lib/orders/order-status.ts`: export `ORDER_STATUSES` array + display labels + badge color map (single source for UI + validation).
2. `orders-table.tsx` (server-rendered): rows link to `/admin/orders/[id]`; `order-status-badge.tsx` colored per status.
3. `order-status-filter.tsx` (client): sets `?status=` via router; "all" clears.
4. `admin/orders/page.tsx`: `requireStaff()`; read `searchParams.status`; `listOrders({status})`; render filter + table; empty-state.
5. `admin/orders/[id]/page.tsx`: `getOrder(id)`; render `order-detail` (customer, service, note, line items from snapshot, totals) + `order-status-control`.
6. `order-status-control.tsx` (client): select/buttons of allowed statuses → calls `updateStatusAction(id, status)`.
7. `actions.ts`: `updateStatusAction` — `requireStaff()`, validate status ∈ `ORDER_STATUSES`, `updateOrderStatus`, `revalidatePath('/admin/orders')` + `('/admin/orders/'+id)`.
8. Manual: place a public order (Phase 03) → appears in list → filter → open detail → change status → persists.

## Todo List
- [ ] `order-status.ts` constants/labels/colors
- [ ] `orders-table` + `order-status-badge`
- [ ] `order-status-filter` (client)
- [ ] `admin/orders/page.tsx` (staff-guarded, filter)
- [ ] `order-detail` (snapshot line items)
- [ ] `order-status-control` (client) + `actions.ts` (guarded, validated)
- [ ] `admin/orders/[id]/page.tsx`
- [ ] Manual end-to-end (order → list → detail → status change)

## Success Criteria
- Public-placed order appears in `/admin/orders`.
- Filter narrows by status; "all" shows everything.
- Detail shows frozen line-item snapshot + customer/note/totals.
- Status change persists (allowed set only) and updates the list.
- Staff and admin both have full access; anon blocked.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Status set drift between UI and DB check | Med | Med | Single `ORDER_STATUSES` constant; server validates before write; DB check is backstop |
| Detail does live menu lookup (wrong price) | Low | Med | Render only `order_items` snapshot, never `menu_items` |
| Unauthorized status change | Low | Med | `updateStatusAction` calls `requireStaff()`; RLS backstop |
| Large orders table unpaged | Low | Low | Default recent window; add pagination later (YAGNI) |

## Security Considerations
- All order reads/writes gate on `requireStaff()`; anon cannot read/update orders (RLS + guard).
- Status input validated against allowed set server-side.

## Next Steps
- Phase 06 (menu admin) and Phase 07 (settings/users) are independent admin surfaces.
