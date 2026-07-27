# Phase 04 — Card Branch: Session + HPP Redirect

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-online-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-online-payment-design.md) (§5.1 flow, §4.1 HPP rationale)
- Depends on: 02, 03
- Unblocks: 05

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Joins Phase 02's order creation to Phase 03's client. A card checkout creates the order, opens a Windcave session against the **server-computed** total, persists the session id and `links`, and hands the browser the hosted-payment-page URL to redirect to.

## Key Insights
- **The amount sent to Windcave comes from the persisted `orders.total`**, re-read or carried directly from `createOrder` — never from the request body. This is the single most important line in the milestone.
- Callback and notification URLs are absolute and must be publicly reachable. They are built from `WINDCAVE_NOTIFICATION_BASE_URL`, **not** from request headers — a `Host` header is attacker-controlled and would let someone redirect payment callbacks.
- Store the **whole `links` array** on the order. Passing it through intact is what keeps a future Drop-In migration frontend-only.
- A server action cannot navigate the browser cross-origin. Return the URL and let the client assign `window.location.href`; `redirect()` only works for same-origin App Router navigation.
- If session creation fails, the order already exists as `pending_payment`. That is correct and recoverable — do **not** delete it. Phase 06's retry reuses it.

## Requirements
**Functional**
- Card checkout returns `{ redirectUrl }`; the client navigates there.
- `orders.windcave_session_id` and the `links` array are persisted before the redirect.
- A `payment_events` row of kind `session_created` records the raw response.
- Session-creation failure returns a friendly error, leaves the order `pending_payment`, and records a `session_failed` event.
- Customer email and phone are forwarded so Windcave can send its own receipt and run 3DS checks.

**Non-functional**
- No secret or raw gateway body ever reaches the client.
- Callback URLs never derive from request headers.

## Architecture
- `lib/orders/start-payment.ts` — the composition point. Takes a `CreatedOrder`, returns a redirect URL or an error. This is the only module that knows both order concepts and Windcave concepts.
- `app/(site)/checkout/actions.ts` — card branch calls it and returns the URL.

## Related Code Files
**Create**
- `lib/orders/start-payment.ts`
- `lib/orders/payment-events.ts`

**Modify**
- `app/(site)/checkout/actions.ts` (replace the Phase 02 card placeholder)

**Delete:** none

## Implementation Steps

1. Confirm `orders.windcave_links` exists — it ships in Phase 01's `0005` migration. If that migration was already applied without it, add it in a follow-up migration rather than editing `0005`, then `npm run db:types`.

2. Write `lib/orders/payment-events.ts` — one place for the audit trail so every phase writes it the same way:

```ts
import 'server-only';

import { createServiceClient } from '@/lib/supabase/service-client';

export type PaymentEventKind =
  | 'session_created'
  | 'session_failed'
  | 'callback_received'
  | 'fprn_received'
  | 'session_queried'
  | 'marked_paid'
  | 'amount_mismatch';

/**
 * Appends to the gateway audit trail. Never throws — a failed audit write must
 * not take down a payment flow, but it is logged so it is not silent.
 */
export async function recordPaymentEvent(
  orderId: string,
  kind: PaymentEventKind,
  raw: unknown,
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('payment_events').insert({ order_id: orderId, kind, raw: raw ?? {} });
  } catch (cause) {
    console.error(`payment_events insert failed (${kind}, order ${orderId})`, cause);
  }
}
```

3. Write `lib/orders/start-payment.ts`:

```ts
import 'server-only';

import { createServiceClient } from '@/lib/supabase/service-client';
import { windcaveEnv } from '@/lib/windcave/env';
import { createSession, formatAmount, hppUrl } from '@/lib/windcave/client';
import { recordPaymentEvent } from './payment-events';
import type { CreatedOrder } from './create-order';

export type StartPaymentResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

/**
 * Opens a Windcave session for an already-persisted order and returns the hosted
 * payment page URL. The charged amount comes from the order, never the request.
 */
export async function startPayment(
  order: CreatedOrder,
  customer: { email: string; phone: string },
): Promise<StartPaymentResult> {
  const env = windcaveEnv();

  // Absolute, config-derived URLs. Never built from request headers — a Host
  // header is attacker-controlled and would divert payment callbacks.
  const base = env.notificationBaseUrl;
  const returnUrl = `${base}/order/return/${order.publicToken}`;

  try {
    const session = await createSession({
      amount: formatAmount(order.total),
      currency: env.currency,
      merchantReference: order.reference,
      callbackUrls: {
        approved: `${returnUrl}?outcome=approved`,
        declined: `${returnUrl}?outcome=declined`,
        cancelled: `${returnUrl}?outcome=cancelled`,
      },
      notificationUrl: `${base}/api/windcave/fprn?t=${order.notificationToken}`,
      customer: {
        email: customer.email || undefined,
        phoneNumber: customer.phone || undefined,
      },
    });

    const url = hppUrl(session);

    const supabase = createServiceClient();
    await supabase
      .from('orders')
      .update({
        windcave_session_id: session.id,
        // Stored intact — Windcave recommends passing links through unmodified,
        // and it keeps a future Drop-In swap frontend-only.
        windcave_links: session.links ?? null,
      })
      .eq('id', order.orderId);

    await recordPaymentEvent(order.orderId, 'session_created', session);

    return { ok: true, redirectUrl: url };
  } catch (cause) {
    await recordPaymentEvent(order.orderId, 'session_failed', { message: String(cause) });
    console.error('Windcave session creation failed', cause);
    return { ok: false, error: 'We could not reach the payment provider. Please try again.' };
  }
}
```

4. Replace the card placeholder in `app/(site)/checkout/actions.ts`:

```ts
export type CheckoutResult = { error: string } | { redirectUrl: string };

// …inside submitCheckout, after createOrder succeeds:

  if (payload.paymentMethod === 'cash') {
    redirect(`/order/${created.order.publicToken}`);
  }

  const started = await startPayment(created.order, {
    email: payload.email.trim(),
    phone: payload.phone.trim(),
  });

  // The order stays `pending_payment` on failure — it is reusable, not garbage.
  if (!started.ok) return { error: started.error };

  return { redirectUrl: started.redirectUrl };
```

Note `redirect()` throws internally in Next.js — keep it outside any `try`/`catch` that would swallow it.

5. Manual verification against UAT (needs `WINDCAVE_*` set and a tunnel running):
   - Add a dish, check out with Card.
   - Confirm the browser lands on a `uat.windcave.com` hosted page.
   - Confirm the `orders` row has `windcave_session_id`, `windcave_links`, `status='pending_payment'`, `payment_status='pending'`.
   - Confirm one `payment_events` row of kind `session_created`.
   - Confirm the session amount on Windcave's page equals the server total, then **tamper with the client payload** (send `qty` 1 but a doctored cart) and confirm the amount still matches the server recomputation.

6. `npm run lint`, `npm run build`.

## Todo List
- [ ] `windcave_links` column added and types regenerated
- [ ] `lib/orders/payment-events.ts` (never throws)
- [ ] `lib/orders/start-payment.ts`
- [ ] `actions.ts` card branch returns `redirectUrl`
- [ ] Manual UAT: redirect reaches the Windcave hosted page
- [ ] Verified session amount survives a tampered client payload
- [ ] `lint` / `build` green

## Success Criteria
1. A card checkout lands on the Windcave UAT hosted page showing the correct amount.
2. Session id and links are persisted before redirect.
3. Gateway outage produces a friendly error and a reusable `pending_payment` order, not a crash.
4. Callback URLs are absolute and config-derived — grep confirms no `headers()`-derived host in the payment path.

## Risk Assessment
- **`WINDCAVE_NOTIFICATION_BASE_URL` unset or pointing at `localhost`** → Windcave cannot reach the callback and FPRN silently never arrives. Phase 01's `required()` catches unset; a `localhost` value needs the tunnel. Document loudly in Phase 07.
- **Tunnel URL changes between sessions** (ngrok free tier) → sessions created under an old URL get orphaned callbacks. Prefer a stable tunnel or a preview deployment.

## Security Considerations
- Callback URLs derived from config, never headers — this is the host-header-injection defence.
- `WindcaveError.body` is logged server-side and never returned to the client.
- The customer sees a generic failure message; gateway detail stays in `payment_events`.

## Next Steps
Phase 05 handles what happens when the customer comes back — and when they do not.
