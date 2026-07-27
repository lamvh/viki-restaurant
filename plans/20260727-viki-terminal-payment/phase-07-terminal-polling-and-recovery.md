# Phase 07 — Terminal Polling on Orders + Recovery

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-terminal-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-terminal-payment-design.md) (§5.1 flow, §5.2 recovery, §8 errors)
- Depends on: 06
- Unblocks: 08

## Overview
- **Priority:** P1 (the correctness core of the milestone)
- **Status:** ✅ done
- **Description:** The polling loop. A staff-guarded route relays Status requests to the terminal; the UI renders the terminal's own `DL1`/`DL2` prompts and `B1`/`B2` buttons until `Complete=1`, then finalises the order. Plus recovery for a sale interrupted by a closed browser.

## Key Insights
- **The browser polls our route, never Windcave.** That keeps `ScrHITKey` server-side and lets us re-check the staff session on **every tick** — an unguarded poll endpoint is a remote control for a card terminal sitting on a public counter.
- **`Complete` terminates the loop, not `ReCo`.** A `Complete=0` response with a decline-looking `ReCo` is still mid-flight.
- **Render `DL1`/`DL2` verbatim.** They are the terminal's own words and stay in sync with what the cardholder is seeing. Paraphrasing them desynchronises the two screens at exactly the wrong moment.
- **`B1`/`B2` are for the staff member**, not the cardholder — e.g. a cancel or a "signature OK?" confirmation. Render them only when present; pressing one relays the choice on the next Status request.
- **Finalisation must be idempotent.** The poll may resolve at the same moment a second tab polls, or a recovery re-poll may land on an already-finalised sale. Use a conditional update, same discipline as the online channel's reconcile.
- **Amount is verified at finalisation.** An authorised result whose amount differs from `orders.total` must not fulfil. Tipping is confirmed **off** for this MID and there is no split bill, so a mismatch should never occur — the guard is a safety net, and if it ever fires it means tipping was switched on somewhere and needs turning back off.
- **`unpaid` and `failed` are not terminal states.** Both mean *not complete*, and staff need three exits from the failed panel: retry the terminal, settle as cash, or read the error. An order must never be left with no way forward.
- **Recovery is the whole point of persisting `hit_txn_ref` in Phase 05.** An order stuck at `pending` with a ref is not lost — re-poll it.

## Requirements
**Functional**
- `GET /api/admin/terminal/status?ref=…` returns the parsed status; 401 without a staff session.
- The UI polls ~1s while a charge is live, rendering `DL1`/`DL2` and any `B1`/`B2`.
- Pressing `B1`/`B2` relays the choice on the next poll.
- `Complete=1` + authorised + matching amount → `paid`, `payment_method='terminal'`, `paid_at`.
- `Complete=1` + not authorised → `failed`; order chargeable again.
- The failed panel offers three exits: retry the terminal, settle as cash, or read the decline reason.
- Amount mismatch → refuse, record `amount_mismatch`, leave for manual review — **no** cash-settle shortcut.
- An order at `pending` with a `hit_txn_ref` shows **Resume** and re-polls.
- Polling gives up after a bounded window and offers Resume rather than looping forever.

**Non-functional**
- Finalisation is idempotent and concurrency-safe.
- Polling stops on unmount; no orphan intervals.

## Architecture
- `lib/orders/terminal-payment.ts` gains `pollTerminalPayment` and `finaliseTerminalPayment`.
- `app/api/admin/terminal/status/route.ts` — thin, staff-guarded relay.
- `components/admin/orders/terminal-payment-dialog.tsx` — the polling UI.

## Related Code Files
**Create**
- `app/api/admin/terminal/status/route.ts`
- `components/admin/orders/terminal-payment-dialog.tsx`
- `lib/orders/terminal-payment.test.ts`

**Modify**
- `lib/orders/terminal-payment.ts` (add poll + finalise)
- `components/admin/orders/order-row.tsx` (open the dialog; show Resume when recoverable)

**Delete:** none

## Implementation Steps

1. Add polling and finalisation to `lib/orders/terminal-payment.ts`:

```ts
import { pollStatus } from '@/lib/windcave/hit-client';
import type { HitStatus } from '@/lib/windcave/hit-types';

export type PollOutcome = HitStatus & { settled?: 'paid' | 'failed' | 'mismatch' };

/**
 * One poll tick. Relays a B1/B2 press if given, and finalises the order the
 * moment the terminal reports Complete.
 */
export async function pollTerminalPayment(
  orderId: string,
  txnRef: string,
  button?: 'B1' | 'B2',
): Promise<PollOutcome> {
  const status = await pollStatus({ txnRef, button });
  if (!status.complete) return status;

  const settled = await finaliseTerminalPayment(orderId, txnRef, status);
  return { ...status, settled };
}

/**
 * Idempotent. Safe to call from a second tab, or from a recovery re-poll that
 * lands on an already-finalised sale.
 */
export async function finaliseTerminalPayment(
  orderId: string,
  txnRef: string,
  status: HitStatus,
): Promise<'paid' | 'failed' | 'mismatch'> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, total, payment_status')
    .eq('id', orderId)
    .single();

  if (!order) return 'failed';
  if (order.payment_status === 'paid') return 'paid';

  await recordPaymentEvent(orderId, 'terminal_completed', { txnRef, status });

  if (status.result?.authorised === true) {
    const expected = formatHitAmount(Number(order.total));
    const actual = status.result.amount;

    // Most likely cause of a mismatch is terminal-side tipping, which this app
    // has no concept of. Never fulfil on an amount we did not compute.
    if (actual && actual !== expected) {
      await recordPaymentEvent(orderId, 'amount_mismatch', { expected, actual, txnRef });
      return 'mismatch';
    }

    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_method: 'terminal',
        status: 'new',
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('payment_status', 'pending');

    return 'paid';
  }

  await supabase
    .from('orders')
    .update({ payment_status: 'failed' })
    .eq('id', orderId)
    .eq('payment_status', 'pending');

  return 'failed';
}
```

2. Write `app/api/admin/terminal/status/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth/require-role';
import { createServiceClient } from '@/lib/supabase/service-client';
import { pollTerminalPayment } from '@/lib/orders/terminal-payment';

export const dynamic = 'force-dynamic';

/**
 * Staff-guarded relay. The browser never talks to Windcave directly — the HIT
 * key stays server-side, and staff auth is re-checked on every single tick.
 */
export async function GET(request: NextRequest) {
  try {
    await requireStaff();
  } catch {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const orderId = request.nextUrl.searchParams.get('orderId');
  const button = request.nextUrl.searchParams.get('button');
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, hit_txn_ref')
    .eq('id', orderId)
    .single();

  if (!order?.hit_txn_ref) {
    return NextResponse.json({ error: 'No payment in progress' }, { status: 404 });
  }

  try {
    const status = await pollTerminalPayment(
      order.id,
      order.hit_txn_ref,
      button === 'B1' || button === 'B2' ? button : undefined,
    );
    return NextResponse.json(status);
  } catch (cause) {
    console.error('Terminal poll failed', cause);
    return NextResponse.json({ error: 'Terminal unreachable' }, { status: 502 });
  }
}
```

3. Write `components/admin/orders/terminal-payment-dialog.tsx`:
   - Props: `orderId`, `onClose`.
   - Polls `/api/admin/terminal/status?orderId=…` every **1000ms** via `setInterval` in a `useEffect`, clearing on unmount.
   - Renders `dl1` and `dl2` **verbatim** as the primary display, large enough to read across a counter.
   - Renders `b1`/`b2` as buttons when present; clicking sends the next poll with `&button=B1`.
   - On `settled === 'paid'` → success state, stop polling, refresh the list (`router.refresh()`).
   - On `settled === 'failed'` → decline panel offering **all three** exits: **Try again** (re-runs the charge action, new `TxnRef`), **Mark paid (cash)** (calls `markOrderPaidCash`), and the decline reason from `result.responseText` shown plainly. The order is not complete and staff must be able to resolve it without leaving the dialog.
   - On `settled === 'mismatch'` → a distinct "needs manual review" state, **not** worded as success, and **without** a cash-settle button — an unexplained amount difference is not something to paper over by marking it paid.
   - On repeated `502` → stop after **120 ticks (~2 minutes)** and show Resume rather than polling forever.
   - Uses the existing focus-trap helper `lib/use-focus-trap.ts`, matching `components/menu/item-modal.tsx`.

4. Update `order-row.tsx`: open the dialog after a successful charge, and show a **Resume** button whenever `paymentStatus === 'pending'` and a `hit_txn_ref` exists — that is the recoverable case where the browser died mid-sale.

5. Write `lib/orders/terminal-payment.test.ts` with `hit-client` and the Supabase service client mocked. Cover:
   - `Complete=0` → returns status, **no** DB write.
   - `Complete=1` + authorised + matching amount → `'paid'`, update conditioned on `payment_status='pending'`.
   - `Complete=1` + authorised + amount `"15.00"` vs a `12.50` order → `'mismatch'`, no paid update.
   - `Complete=1` + not authorised → `'failed'`.
   - Already `paid` on entry → `'paid'` with no second update (idempotency).
   - `startTerminalPayment` increments `hit_attempt` and builds `VK-XXXXXX-2`.
   - A busy order (`payment_status='pending'`) is refused.
   - Button relay passes `B1` through to `pollStatus`.

6. `npm test`, `npm run lint`, `npm run build`.

## Todo List
- [x] `pollTerminalPayment` + idempotent `finaliseTerminalPayment`
- [x] Staff-guarded `/api/admin/terminal/status` route (401 without session)
- [x] Polling dialog rendering DL1/DL2 verbatim + B1/B2 buttons
- [x] Bounded polling (~2 min) then Resume
- [x] Resume path for orders stuck `pending` with a ref
- [x] Mismatch state worded as needs-review, never success
- [x] `terminal-payment.test.ts` covering all eight cases
- [x] `tsc` / `lint` / 112 tests green · [ ] `npm run build` not run (dev server shares `.next`)

## Success Criteria
1. A live sale shows the terminal's own prompts changing in step with the device.
2. `B1`/`B2` appear when offered and the press reaches the terminal.
3. An approved sale marks the order `paid` with `payment_method='terminal'`.
4. Polling from a signed-out browser gets 401 and cannot drive the terminal.
5. Closing the browser mid-sale and reopening shows Resume, which reports the true outcome.
6. Finalising twice produces one `paid` transition and one `terminal_completed` event pair.

## Risk Assessment
- **Tipping is confirmed off** for this MID, so the mismatch path should be unreachable. Verify during Phase 07 UAT anyway: if tipping is ever enabled later, every sale trips the guard and the failure looks baffling without this note.
- **Poll interval too aggressive** — 1s is the documented expectation; do not drop below it.
- **`setInterval` overlap** if a poll takes longer than the interval. Guard with an in-flight flag so ticks cannot stack.
- **Resume on a very old ref** may return nothing useful if Windcave has aged the transaction out. Falls through to `failed`, which is chargeable again — acceptable.

## Security Considerations
- Staff auth re-checked per tick, not once at dialog open.
- The HIT key never reaches the browser; the route is the only thing that talks to Windcave.
- `orderId` is used to look up the stored ref rather than trusting a client-supplied `TxnRef` — otherwise staff could poll arbitrary references.

## Next Steps
Phase 07 runs the full UAT against the physical terminal and closes out the docs.
