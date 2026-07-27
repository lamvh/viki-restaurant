# Phase 05 — Confirmation Page + Checkout Rewiring

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-terminal-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-terminal-payment-design.md) (§7 modules, §8 cart lifecycle, §9 errors)
- Depends on: 04
- Unblocks: 06

## Overview
- **Priority:** P1
- **Status:** ✅ done
- **Description:** Replaces the `localStorage` confirmation with a server-rendered page backed by the database, rewires `CheckoutForm` onto the server action, fixes the cart lifecycle so a declined card keeps the cart, adds retry, and stops unpaid orders reaching the kitchen dashboard.

## Key Insights
- **The cart must survive a declined payment.** The current mock clears it at submit — harmless for a fake order, hostile for a real declined card. Clearing moves to the confirmation page, and only for a paid or cash order.
- The confirmation page is reached by an **opaque token**, so it must not be indexed and must not be statically cached. `robots: noindex` plus `dynamic = 'force-dynamic'`.
- A customer can land on `/order/{token}` while the gateway is still settling. The page needs a genuine *pending* state, not just paid/failed.
- Retry reuses the same order row and opens a **fresh** session. Reusing the old session id would re-query a completed, declined session forever.
- `getDashboardMetrics` counts and sums every recent order. Once `pending_payment` rows exist, unpaid orders would inflate revenue and land in the kitchen queue. Filter them out.
- The old `/order/confirmed` route and `order-confirmed-view.tsx` become dead code — delete rather than leave two confirmation paths.

## Requirements
**Functional**
- `/order/[token]` server-renders order reference, status, service, ETA, line items, and total from the database.
- Paid and cash orders show confirmation; `pending` shows a settling state; `failed` shows a retry.
- Cart clears only once a paid or cash order is displayed.
- `retryPayment(token)` opens a new session on the existing order and redirects to the new HPP URL.
- Unknown token → 404.
- `pending_payment` orders are excluded from dashboard counts, revenue, and the open queue.

**Non-functional**
- Confirmation page is `noindex`, never cached.
- Existing checkout tests updated, not deleted.

## Architecture
- `lib/orders/get-order-by-token.ts` — single read, returns order + items or null.
- `app/(site)/order/[token]/page.tsx` — server component.
- `components/checkout/order-status-view.tsx` — presentation for the three states.
- `components/cart/clear-cart-on-success.tsx` — tiny client component; the only thing that needs to be client-side on that page.

## Related Code Files
**Create**
- `lib/orders/get-order-by-token.ts`
- `app/(site)/order/[token]/page.tsx`
- `components/checkout/order-status-view.tsx`
- `components/cart/clear-cart-on-success.tsx`

**Modify**
- `components/checkout/checkout-form.tsx` (call the server action; pending + error states)
- `app/(site)/checkout/actions.ts` (add `retryPayment`)
- `store/cart-store.ts` (remove `placeOrder` / `justPlaced` / `lastOrder`)
- `components/checkout/checkout-view.tsx` (drop the `justPlaced` guard)
- `lib/db/get-dashboard-metrics.ts` (exclude `pending_payment`)
- `components/checkout/checkout-view.test.tsx` (update to the new flow)
- `types/cart.ts` (drop the now-unused `Order` type)

**Delete**
- `app/(site)/order/confirmed/page.tsx`
- `components/checkout/order-confirmed-view.tsx`

## Implementation Steps

1. Write `lib/orders/get-order-by-token.ts`:

```ts
import 'server-only';

import { createServiceClient } from '@/lib/supabase/service-client';

export type OrderItemView = {
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  options: string[];
};

export type OrderView = {
  id: string;
  reference: string;
  service: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  total: number;
  createdAt: string;
  items: OrderItemView[];
};

export async function getOrderByToken(token: string): Promise<OrderView | null> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('orders')
    .select(
      'id, reference, service, status, payment_status, payment_method, subtotal, total, created_at, order_items(item_name, quantity, unit_price, line_total, options)',
    )
    .eq('public_token', token)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    reference: data.reference,
    service: data.service,
    status: data.status,
    paymentStatus: data.payment_status,
    paymentMethod: data.payment_method,
    subtotal: Number(data.subtotal),
    total: Number(data.total),
    createdAt: data.created_at,
    items: (data.order_items ?? []).map((row) => ({
      itemName: row.item_name,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      lineTotal: Number(row.line_total),
      options: Array.isArray(row.options) ? (row.options as string[]) : [],
    })),
  };
}
```

2. Add `retryPayment` to `app/(site)/checkout/actions.ts`:

```ts
/**
 * Reopens payment on an existing order after a decline or a gateway failure.
 * A fresh session is required — the previous one is spent.
 */
export async function retryPayment(token: string): Promise<CheckoutResult> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, reference, total, public_token, notification_token, payment_status, customer_phone, email')
    .eq('public_token', token)
    .single();

  if (!order) return { error: 'Order not found.' };
  if (order.payment_status === 'paid') return { error: 'This order is already paid.' };

  // Clear the previous failed attempt so reconcile treats the new session as live.
  await supabase.from('orders').update({ payment_status: 'pending' }).eq('id', order.id);

  const started = await startPayment(
    {
      orderId: order.id,
      reference: order.reference,
      publicToken: order.public_token,
      notificationToken: order.notification_token,
      total: Number(order.total),
    },
    { email: order.email ?? '', phone: order.customer_phone ?? '' },
  );

  if (!started.ok) return { error: started.error };
  return { redirectUrl: started.redirectUrl };
}
```

3. Write `components/cart/clear-cart-on-success.tsx`:

```ts
'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/store/cart-store';

/**
 * Clears the cart once — and only once — an order is confirmed. Deliberately not
 * done at submit: a declined card must return the customer to an intact cart.
 */
export function ClearCartOnSuccess() {
  const clearCart = useCartStore((s) => s.clearCart);
  useEffect(() => {
    clearCart();
  }, [clearCart]);
  return null;
}
```

4. Write `components/checkout/order-status-view.tsx` rendering three states from `OrderView`, reusing existing tokens (`bg-surface-alt`, `border-line`, `rounded-[var(--radius-card)]`) and the `Money` component:
   - **Confirmed** — `paymentStatus === 'paid' || paymentStatus === 'unpaid'`: reference, ETA via `etaFor(service)`, items, total. Cash adds "Please pay on collection." Renders `<ClearCartOnSuccess />`.
   - **Settling** — `pending`: "We're confirming your payment." with a refresh link. No cart clear.
   - **Failed** — `failed`: decline message and a `retryPayment` submit button. No cart clear.

5. Write `app/(site)/order/[token]/page.tsx`:

```ts
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getOrderByToken } from '@/lib/orders/get-order-by-token';
import { OrderStatusView } from '@/components/checkout/order-status-view';

// Token-addressed and per-customer — never index, never cache.
export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <OrderStatusView order={order} token={token} />
    </main>
  );
}
```

6. Rewire `components/checkout/checkout-form.tsx`:
   - Replace `placeOrder()` with `submitCheckout(payload)` inside a `useTransition`.
   - Build `lines` from the cart as `{ itemId: line.id, choiceIds: line.choiceIds, qty: line.qty, notes: line.notes }`.
   - On `{ redirectUrl }` → `window.location.href = redirectUrl` (cross-origin; `router.push` will not do it).
   - On `{ error }` → render it above the submit button and re-enable the form.
   - Disable the button while pending, with label "Redirecting to payment…" for card and "Placing order…" for cash.
   - **Do not clear the cart here.**

7. Simplify `store/cart-store.ts`: delete `placeOrder`, `lastOrder`, `justPlaced`, `clearJustPlaced`, and `nextOrderNumber`; drop `lastOrder` from `partialize`. Keep `clearCart`. Remove the `justPlaced` guard from `checkout-view.tsx` so it simply redirects to `/menu` on an empty cart.

8. Delete `app/(site)/order/confirmed/page.tsx` and `components/checkout/order-confirmed-view.tsx`. Remove the now-unused `Order` type from `types/cart.ts`. Grep for `lastOrder`, `justPlaced`, `placeOrder`, and `/order/confirmed` and clear every hit.

9. Exclude unpaid orders in `lib/db/get-dashboard-metrics.ts` — add to the query, so an unpaid order never reaches the kitchen or inflates revenue:

```ts
    .neq('status', 'pending_payment')
```

10. Update `components/checkout/checkout-view.test.tsx` and `store/cart-store.test.ts` for the removed API. Add a test that submitting does **not** clear the cart.

11. `npm test`, `npm run lint`, `npm run build`.

## Todo List
- [x] `get-order-by-token.ts`
- [~] `retryPayment` — deferred with the online milestone (card-only concern)
- [x] `clear-cart-on-success.tsx`
- [x] `order-status-view.tsx` — confirmed / settling / failed
- [x] `/order/[token]/page.tsx`, noindex + force-dynamic — verified in rendered HTML
- [x] `checkout-form.tsx` on the server action
- [x] `cart-store.ts` mock order API removed (placeOrder / lastOrder / justPlaced)
- [x] Old `/order/confirmed` route + view + payment-methods deleted, all references cleared
- [x] Dashboard excludes `pending_payment`
- [x] Tests updated; cart-stays-intact test added
- [x] `tsc` / `lint` / 105 tests green; confirmation page verified end-to-end against the dev server

## Success Criteria
1. A paid card order shows its reference, items, and total read from the database — verified by clearing `localStorage` and reloading.
2. A declined card returns to an intact cart, and retry opens a fresh session.
3. Cash orders confirm immediately with a pay-on-collection note.
4. An unknown token 404s.
5. A `pending_payment` order appears in neither dashboard revenue nor the open queue.
6. No reference to `placeOrder`, `lastOrder`, `justPlaced`, or `/order/confirmed` remains.

## Risk Assessment
- **`window.location.href` vs `redirect()`** — the HPP URL is cross-origin, so a server-side `redirect()` cannot be used for it. Returning the URL is deliberate.
- **Retry resets `payment_status` to `pending`** — safe because a new session id overwrites the old one in the same flow; reconcile then queries the new session.
- **Deleting the confirmed route** breaks any bookmark. Acceptable: nothing real was ever ordered through the mock.

## Security Considerations
- Confirmation is authorised solely by an unguessable `public_token`. It is `noindex` so tokens never enter a search index.
- The page exposes only the customer's own order fields — no gateway detail, no `notification_token`.

## Next Steps
Phase 07 hardens with the full test matrix, the UAT runbook, and the standing account documentation.
