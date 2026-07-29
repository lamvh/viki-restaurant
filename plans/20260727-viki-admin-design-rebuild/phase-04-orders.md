# Phase 04 — Orders

**Priority:** high
**Status:** planned

## Overview

Replace the orders table with the design's two-column layout: a card list on the
left, a sticky order-detail panel on the right, status pills above.

## Layout

- **Status tabs** — All / New / Preparing / Ready / Completed, each with a live
  count. `Awaiting payment` is kept as a sixth tab: the design has no such state
  but the schema does, and hiding unpaid orders would hide real work.
- **Service segmented control** — All / Pickup / Delivery.
- **Order card** — reference, service pill, status pill, customer, elapsed time,
  total, and a one-line item summary.
- **Detail panel** — header (reference + status), a service block tinted by
  service, the item list with notes, the total, and the advance action.
- **Mobile** — selecting an order renders the detail as a full-screen overlay
  instead of a side panel.

## Selection model

Selection lives in the URL (`?order=<reference>`), not in client state:

- the panel stays server-rendered, so items come straight from the DB with no
  client fetch or loading flicker;
- a staff member can reload or bookmark the order they are working;
- `revalidatePath` after a status change refreshes list and panel together.

Filters likewise stay in `searchParams` (`?status=`, `?service=`), matching the
existing page.

## Elapsed time

Rendered as "2 min ago" from `created_at`. Formatting must happen in a client
component (or with `suppressHydrationWarning`) — a server-rendered relative time
mismatches the client clock and triggers a hydration error.

## Files

- **Create** `lib/orders/elapsed-label.ts` + test — `createdAt → "2 min ago"`
- **Create** `lib/db/get-order-summaries.ts` — orders + item summaries for the list
- **Create** `components/admin/orders/order-card.tsx`
- **Create** `components/admin/orders/order-detail-panel.tsx`
- **Create** `components/admin/orders/order-filter-tabs.tsx`
- **Create** `components/admin/orders/elapsed-time.tsx` (client)
- **Modify** `app/admin/orders/page.tsx`
- **Modify** `components/admin/orders/order-status-control.tsx` — restyle to the
  design's full-width advance button; keep the existing action + guard
- **Delete** `components/admin/orders/order-row.tsx` (superseded)

## Preserved behaviour

`chargeOrderToTerminal`, `markOrderPaidCash`, the terminal dialog, receipt
fetching and auto-print all keep working — this phase restyles their entry
points, it does not touch the payment path.

## Success criteria

- Advancing an order updates both list and panel in one round trip.
- Deep-linking `?order=VK-2371&status=new` restores the exact view.
- No hydration warnings from the relative timestamps.
