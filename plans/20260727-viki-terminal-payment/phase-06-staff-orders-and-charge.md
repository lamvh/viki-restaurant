# Phase 06 — Staff Order List + Charge

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-terminal-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-terminal-payment-design.md) (§5.1 flow, §5.2 TxnRef, §5.3 authorisation)
- Depends on: 05
- Unblocks: 07

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Gives staff somewhere to work from. A minimal `/admin/orders` list of today's orders with a **Take card payment** action that allocates a `TxnRef`, persists it, and starts the terminal purchase.

## Key Insights
- **`hit_txn_ref` is persisted BEFORE the POST.** If the browser dies between POST and response, the card may already be charged, and the only way to find out is a Status request with that same ref. Writing it afterwards leaves a window where money moved and the app has no record. This is the single most important ordering constraint in the milestone.
- **Retry allocates a new ref** by incrementing `hit_attempt` — `VK-7KQ2X9-1`, `-2`, `-3`. Reusing a ref returns the previous declined result forever.
- `TxnRef` is capped at 40 characters by the protocol; `VK-XXXXXX-NN` is 12 and safe.
- The admin dashboard is metrics-only today, so this list is new. Keep it **minimal** — this is not the deferred full order-management UI, just enough to find an order and charge it.
- **Concurrency is real here**: one physical terminal, possibly two staff on two tablets. The conditional update is what stops a second charge starting while the first is live.
- Everything under `/admin` is already gated by `middleware.ts`, but the server action must **still** call `requireStaff()` — middleware protects pages, not direct action invocation.

## Requirements
**Functional**
- `/admin/orders` lists recent orders: reference, time, service, total, status, payment status.
- Orders with `payment_status` of `unpaid` or `failed` show a **Take card payment** button.
- `startTerminalPayment(orderId)` allocates and persists the next `TxnRef`, then posts a Purchase.
- A charge already in flight on the same order returns "terminal busy" rather than starting a second.
- Every attempt records a `terminal_started` payment event.

**Non-functional**
- `requireStaff()` on the page read and on the action.
- Amount read from `orders.total`, never from the request.
- Under 200 lines per file.

## Architecture
- `lib/db/list-orders.ts` — staff-guarded read, mirrors `get-dashboard-metrics.ts`.
- `lib/orders/terminal-payment.ts` — ref allocation, start, and (in Phase 06) poll/finalise.
- `app/admin/orders/page.tsx` — server component list.
- `components/admin/orders/order-row.tsx` — row + charge button.

## Related Code Files
**Create**
- `lib/db/list-orders.ts`
- `lib/orders/terminal-payment.ts`
- `app/admin/orders/page.tsx`
- `app/admin/orders/actions.ts`
- `components/admin/orders/order-row.tsx`

**Modify**
- `components/admin/layout/*` (add an Orders nav link — match the existing nav component's pattern)

**Delete:** none

## Implementation Steps

1. Write `lib/db/list-orders.ts`:

```ts
import { requireStaff } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server-client';

export type StaffOrder = {
  id: string;
  reference: string;
  service: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string | null;
  createdAt: string;
};

/** Staff-guarded recent-orders read for the admin order screen. */
export async function listOrders(limit = 50): Promise<StaffOrder[]> {
  await requireStaff();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, reference, service, total, status, payment_status, payment_method, customer_name, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((o) => ({
    id: o.id,
    reference: o.reference,
    service: o.service,
    total: Number(o.total),
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    customerName: o.customer_name,
    createdAt: o.created_at,
  }));
}
```

2. Write the ref allocation and start logic in `lib/orders/terminal-payment.ts`:

```ts
import 'server-only';

import { createServiceClient } from '@/lib/supabase/service-client';
import { recordPaymentEvent } from './payment-events';
import { startPurchase, formatHitAmount } from '@/lib/windcave/hit-client';
import { hitEnv } from '@/lib/windcave/hit-env';

export type StartTerminalResult =
  | { ok: true; txnRef: string }
  | { ok: false; error: string };

const CHARGEABLE = ['unpaid', 'failed'];

/**
 * Allocates a fresh TxnRef, persists it, then starts the purchase on the
 * terminal. The ref is written BEFORE the POST: if this process dies mid-call
 * the card may still be charged, and the ref is the only way to find out.
 */
export async function startTerminalPayment(orderId: string): Promise<StartTerminalResult> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, reference, total, payment_status, hit_attempt')
    .eq('id', orderId)
    .single();

  if (!order) return { ok: false, error: 'Order not found.' };
  if (order.payment_status === 'paid') return { ok: false, error: 'This order is already paid.' };
  if (!CHARGEABLE.includes(order.payment_status)) {
    return { ok: false, error: 'A payment is already in progress on this order.' };
  }

  const attempt = (order.hit_attempt ?? 0) + 1;
  const txnRef = `${order.reference}-${attempt}`;

  // Conditional update = the concurrency guard. One physical terminal, so the
  // loser of a race must be told, not shown a second prompt.
  const { data: claimed } = await supabase
    .from('orders')
    .update({ hit_txn_ref: txnRef, hit_attempt: attempt, payment_status: 'pending' })
    .eq('id', orderId)
    .in('payment_status', CHARGEABLE)
    .select('id');

  if (!claimed || claimed.length === 0) {
    return { ok: false, error: 'The terminal is busy with another payment.' };
  }

  await recordPaymentEvent(orderId, 'terminal_started', { txnRef, attempt });

  try {
    await startPurchase({
      // Amount from the persisted order — never from the request.
      amount: formatHitAmount(Number(order.total)),
      currency: process.env.WINDCAVE_CURRENCY ?? 'NZD',
      txnRef,
    });
  } catch (cause) {
    await recordPaymentEvent(orderId, 'terminal_start_failed', { txnRef, message: String(cause) });
    // Release the claim so staff can retry; the ref stays for forensics.
    await supabase.from('orders').update({ payment_status: 'failed' }).eq('id', orderId);
    return { ok: false, error: 'Could not reach the terminal. Check it is on and connected.' };
  }

  // hitEnv() is validated here so a config error surfaces before the UI polls.
  hitEnv();

  return { ok: true, txnRef };
}
```

3. Add cash settlement to `lib/orders/terminal-payment.ts`. `unpaid` and `failed`
   both mean *not complete*, and staff need a way out that does not involve the
   terminal — the customer pays with notes instead:

```ts
/**
 * Settles an incomplete order in cash. The other exit from `unpaid`/`failed`,
 * alongside retrying the terminal. Conditional update so it cannot overwrite a
 * payment that completed on the terminal a moment earlier.
 */
export async function settleOrderAsCash(orderId: string): Promise<StartTerminalResult> {
  const supabase = createServiceClient();

  const { data: settled } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      payment_method: 'cash',
      status: 'new',
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .in('payment_status', CHARGEABLE)
    .select('id');

  if (!settled || settled.length === 0) {
    return { ok: false, error: 'This order is not awaiting payment.' };
  }

  await recordPaymentEvent(orderId, 'settled_cash', {});
  return { ok: true, txnRef: '' };
}
```

4. Write `app/admin/orders/actions.ts`:

```ts
'use server';

import { requireStaff } from '@/lib/auth/require-role';
import { startTerminalPayment, settleOrderAsCash } from '@/lib/orders/terminal-payment';

/** Middleware guards pages, not action invocation — re-check staff here. */
export async function chargeOrderToTerminal(orderId: string) {
  await requireStaff();
  return startTerminalPayment(orderId);
}

/** Marks an incomplete order paid in cash. Recorded in payment_events. */
export async function markOrderPaidCash(orderId: string) {
  await requireStaff();
  return settleOrderAsCash(orderId);
}
```

5. Write `app/admin/orders/page.tsx` as a server component calling `listOrders()`, rendering a table of `OrderRow`s. Follow the existing admin dashboard's markup and token usage (`components/admin/dashboard/*`) rather than inventing new styling.

6. Write `components/admin/orders/order-row.tsx` — a client component showing the order fields and a payment-status badge. When `paymentStatus` is `unpaid` or `failed` (both meaning *not complete*), offer **two** actions:
   - **Take card payment** → `chargeOrderToTerminal` in a `useTransition`; on success hand the returned `txnRef` to the Phase 06 dialog.
   - **Mark paid (cash)** → `markOrderPaidCash`, behind a confirm step since it records money as received with no gateway trail.

   Any error from either action renders inline on the row. For this phase, render the returned `txnRef` as plain text — the polling UI lands next.

7. Add an **Orders** link to the admin nav, matching the existing nav component's structure.

8. Manual check without the terminal: click charge on an unpaid order, confirm `hit_txn_ref` and `hit_attempt` are written **before** the request fails, confirm the error is friendly, and confirm a second click allocates `-2`. Then confirm **Mark paid (cash)** settles the order to `paid` / `cash` and writes a `settled_cash` event.

9. `npm run lint`, `npm run build`.

## Todo List
- [ ] `lib/db/list-orders.ts` with `requireStaff()`
- [ ] `terminal-payment.ts` — ref persisted before POST, conditional-update claim
- [ ] `settleOrderAsCash` with conditional update
- [ ] `app/admin/orders/actions.ts` — both actions with their own `requireStaff()`
- [ ] `/admin/orders` page + `order-row.tsx` with Take card payment **and** Mark paid (cash)
- [ ] Orders link in the admin nav
- [ ] Verified ref is written before the POST and increments on retry
- [ ] `lint` / `build` green

## Success Criteria
1. Staff see recent orders with reference, total, and payment status.
2. Charging writes `hit_txn_ref` **before** contacting the terminal — verified by watching the row while the terminal is unplugged.
3. A second concurrent charge on the same order is refused with "terminal busy".
4. Retry allocates `-2`, not the same ref.
5. Both actions refuse without a staff session.
6. **Mark paid (cash)** settles an `unpaid` or `failed` order to `paid`/`cash` and records `settled_cash`; it refuses on an order already `paid` or mid-terminal (`pending`).

## Risk Assessment
- **`payment_status='pending'` is reused for "terminal in flight"** — the same state the online channel uses for "awaiting gateway". Safe because only one channel is live at a time per order, but note it: if both channels ever race on one order, this needs a distinct state.
- **A start that fails after the claim** sets `failed`, which is chargeable again. Correct, but it means a genuine terminal timeout looks the same as a decline until Phase 06's recovery lands.

## Security Considerations
- `requireStaff()` on both the read and the action; middleware alone is not sufficient for server actions.
- The amount is read from the persisted order, so a tampered client cannot alter what the terminal charges.

## Next Steps
Phase 06 adds the polling loop, the terminal prompts, and recovery from an interrupted sale.
