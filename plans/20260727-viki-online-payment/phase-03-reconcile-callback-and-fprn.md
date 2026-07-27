# Phase 05 — Reconcile: Callback + FPRN

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-online-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-online-payment-design.md) (§5.2 trust model, §9 error handling)
- Depends on: 04
- Unblocks: 06

## Overview
- **Priority:** P1 (the correctness core of the milestone)
- **Status:** pending
- **Description:** One idempotent `reconcileSession` that both the returning customer and Windcave's FPRN webhook converge on. It always re-queries Windcave server-side and treats only that response as fact.

## Key Insights
- **Neither the callback query param nor the FPRN body is evidence.** Both are *"something happened, go look"* triggers. A customer can hand-edit `?outcome=approved`; an FPRN POST is unsigned and forgeable. Only `querySession` decides.
- **Paid requires two conditions**, not one: `authorised === true` **and** the session amount equals the stored order total. Checking only `authorised` means a session created against a tampered amount could still mark an order paid.
- **Idempotency comes from a conditional update, not a read-then-write.** `.eq('payment_status', 'pending')` on the UPDATE means two concurrent reconciles produce exactly one transition. A `select` then `update` races and can double-fire.
- `state === 'complete'` does **not** mean paid. It means the session finished. A declined card also produces a complete session.
- The FPRN endpoint must return `200` fast and unconditionally. Windcave retries on non-2xx; returning `500` on an unknown token invites a retry storm.
- **Do not 404 loudly on a bad notification token.** Return `200` with no work done — a probing attacker learns nothing about which tokens exist.

## Requirements
**Functional**
- `reconcileSession(orderId)` queries Windcave and transitions the order at most once.
- Authorised + matching amount → `payment_status='paid'`, `status='new'`, `paid_at`, `windcave_transaction_id`.
- Authorised + **mismatched** amount → stays unpaid, records `amount_mismatch`, flags for manual review.
- Not authorised on a completed session → `payment_status='failed'`, order stays `pending_payment` so it remains retryable.
- Still pending at Windcave → no change.
- `/order/return/[token]` reconciles then redirects to `/order/[token]`.
- `/api/windcave/fprn` accepts POST (and GET), resolves the order by `notification_token`, reconciles, returns 200.

**Non-functional**
- Reconcile is safe to call concurrently and repeatedly.
- Every gateway interaction lands in `payment_events`.

## Architecture
- `lib/windcave/reconcile.ts` — all decision logic, no HTTP framework concerns. The unit-testable core.
- Two thin route handlers that resolve an order, call reconcile, and respond.

## Related Code Files
**Create**
- `lib/windcave/reconcile.ts`
- `lib/windcave/reconcile.test.ts`
- `app/(site)/order/return/[token]/route.ts`
- `app/api/windcave/fprn/route.ts`

**Modify:** none · **Delete:** none

## Implementation Steps

1. Write `lib/windcave/reconcile.ts`:

```ts
import 'server-only';

import { createServiceClient } from '@/lib/supabase/service-client';
import { recordPaymentEvent } from '@/lib/orders/payment-events';
import { querySession, formatAmount } from './client';
import type { WindcaveSession, WindcaveTransaction } from './types';

export type ReconcileOutcome = 'paid' | 'failed' | 'pending' | 'mismatch' | 'skipped';

function settledTransaction(session: WindcaveSession): WindcaveTransaction | undefined {
  // Prefer an authorised attempt; fall back to the latest attempt for its decline text.
  const list = session.transactions ?? [];
  return list.find((t) => t.authorised === true) ?? list[list.length - 1];
}

/**
 * Single source of truth for payment state. Safe to call repeatedly and
 * concurrently — the customer's return and Windcave's FPRN both land here.
 */
export async function reconcileSession(orderId: string): Promise<ReconcileOutcome> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, total, payment_status, windcave_session_id')
    .eq('id', orderId)
    .single();

  if (!order) return 'skipped';
  if (order.payment_status === 'paid') return 'paid';
  if (!order.windcave_session_id) return 'skipped';

  let session: WindcaveSession;
  try {
    session = await querySession(order.windcave_session_id);
  } catch (cause) {
    console.error('Windcave query-session failed', cause);
    return 'pending';
  }

  await recordPaymentEvent(orderId, 'session_queried', session);

  const txn = settledTransaction(session);

  if (txn?.authorised === true) {
    const expected = formatAmount(Number(order.total));
    const actual = txn.amount ?? session.amount;

    // Authorised is not enough. A session opened against a wrong amount must
    // never fulfil an order — flag it for a human instead.
    if (actual !== expected) {
      await recordPaymentEvent(orderId, 'amount_mismatch', { expected, actual, session });
      return 'mismatch';
    }

    // Conditional update = idempotency. Two concurrent reconciles, one transition.
    const { data: updated } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'new',
        paid_at: new Date().toISOString(),
        windcave_transaction_id: txn.id ?? null,
      })
      .eq('id', orderId)
      .eq('payment_status', 'pending')
      .select('id');

    if (updated && updated.length > 0) {
      await recordPaymentEvent(orderId, 'marked_paid', { transactionId: txn.id });
    }
    return 'paid';
  }

  // Session finished without authorisation → declined. Keep the order
  // `pending_payment` so the customer can retry against the same order.
  if (session.state === 'complete') {
    await supabase
      .from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', orderId)
      .eq('payment_status', 'pending');
    return 'failed';
  }

  return 'pending';
}
```

2. Write `app/(site)/order/return/[token]/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { recordPaymentEvent } from '@/lib/orders/payment-events';
import { reconcileSession } from '@/lib/windcave/reconcile';

export const dynamic = 'force-dynamic';

/**
 * Where Windcave sends the customer back. The `outcome` param is a hint only —
 * reconcileSession re-queries Windcave and decides for itself.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('public_token', token)
    .single();

  if (order) {
    await recordPaymentEvent(order.id, 'callback_received', {
      outcome: request.nextUrl.searchParams.get('outcome'),
    });
    await reconcileSession(order.id);
  }

  return NextResponse.redirect(new URL(`/order/${token}`, request.nextUrl.origin));
}
```

3. Write `app/api/windcave/fprn/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service-client';
import { recordPaymentEvent } from '@/lib/orders/payment-events';
import { reconcileSession } from '@/lib/windcave/reconcile';

export const dynamic = 'force-dynamic';

/**
 * Fail Proof Result Notification. Fires even when the customer never returns.
 * The body is untrusted — it only tells us which order to go re-query.
 * Always answers 200: a non-2xx makes Windcave retry, and an unknown token
 * must not be distinguishable from a known one.
 */
async function handle(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t');
  if (!token) return NextResponse.json({ received: true });

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('notification_token', token)
    .single();

  if (!order) return NextResponse.json({ received: true });

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  await recordPaymentEvent(order.id, 'fprn_received', body);
  await reconcileSession(order.id);

  return NextResponse.json({ received: true });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
```

4. Write `lib/windcave/reconcile.test.ts` with `querySession` and the Supabase service client mocked. Cover:
   - Authorised + matching amount → `'paid'`, update issued with `.eq('payment_status', 'pending')`.
   - Authorised + amount `"5.00"` against a `12.50` order → `'mismatch'`, **no** paid update, `amount_mismatch` event recorded.
   - Already `paid` on entry → `'paid'` with **no** query and **no** update (idempotency).
   - `state: 'complete'` with `authorised: false` → `'failed'`, order stays `pending_payment`.
   - `state: 'pending'` → `'pending'`, no update.
   - `querySession` throwing → `'pending'`, no update, no crash.
   - Order with no `windcave_session_id` → `'skipped'`.
   - Multiple transactions where an earlier one declined and a later one authorised → picks the authorised one.

5. Manual UAT (tunnel running):
   - Pay with the 3DS test card `5588 8800 0007 7770` / SecureCode `123` → returning lands on `/order/{token}` and the row shows `paid` + `status='new'` + `paid_at`.
   - Check `payment_events` holds `callback_received`, `session_queried`, `marked_paid`, and an `fprn_received`.
   - **Close the tab at the Windcave page instead of returning.** Confirm FPRN alone still marks the order paid.
   - Hit `/order/return/{token}?outcome=approved` manually on an unpaid order → stays unpaid, because the query decides, not the param.
   - POST to the FPRN URL with a bogus `t` → `200`, no state change.

6. `npm test`, `npm run lint`, `npm run build`.

## Todo List
- [ ] `lib/windcave/reconcile.ts` with two-condition paid rule + conditional update
- [ ] `/order/return/[token]/route.ts`
- [ ] `/api/windcave/fprn/route.ts` always-200
- [ ] `reconcile.test.ts` covering all eight cases
- [ ] UAT: happy path via 3DS test card
- [ ] UAT: abandoned tab still paid via FPRN alone
- [ ] UAT: forged `?outcome=approved` does not mark paid
- [ ] `test` / `lint` / `build` green

## Success Criteria
1. Return-then-FPRN, FPRN-then-return, and five duplicate FPRNs all yield exactly one paid order and one `marked_paid` event.
2. A forged `?outcome=approved` changes nothing.
3. An amount mismatch never fulfils; it records `amount_mismatch`.
4. A declined card leaves the order retryable.

## Risk Assessment
- **`orders.total` is `numeric`** and arrives from Supabase as a string. `Number(order.total)` before `formatAmount` — comparing `"12.5"` to `"12.50"` would false-mismatch every payment. Explicitly covered by the mismatch test.
- **Currency is not compared**, only amount. Single-currency (NZD) config makes this safe today; revisit if a second currency is ever enabled.
- **FPRN fires before the session update commits** in a very fast gateway response → reconcile sees no `windcave_session_id` and returns `'skipped'`. The customer's return then reconciles correctly. Acceptable; the retry path covers it.

## Security Considerations
- Query-session as the only authority is the whole defence. Never shortcut it.
- Unknown FPRN tokens answer `200` identically to known ones — no enumeration signal.
- `public_token` lets anyone holding the URL *trigger* a reconcile, which is harmless: it only re-reads Windcave.

## Next Steps
Phase 06 renders the result and rewires checkout to this machinery.
