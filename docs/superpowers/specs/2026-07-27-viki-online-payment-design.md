# Viki — Windcave Online Payment Design

- **Date:** 2026-07-27
- **Status:** Approved for planning
- **Related:** [2026-07-05 homepage & ordering flow spec](./2026-07-05-viki-nextjs-homepage-and-ordering-flow-design.md) · [2026-07-22 admin dashboard spec](./2026-07-22-viki-admin-design.md)

## 1. Summary

Viki's checkout is currently a **client-side mock**. `placeOrder()` in
`store/cart-store.ts` generates a random `VK-####` number, clears the cart, and
writes the result to `localStorage`. Nothing reaches the server. The `orders` and
`order_items` tables exist (`supabase/migrations/0002_orders_tables.sql`) and the
admin dashboard reads them (`lib/db/get-dashboard-metrics.ts`), but **no code path
ever writes a row**. Totals are computed in the browser by `lib/pricing.ts`.

The 2026-07-22 admin spec assumed orders would be persisted by the public site;
that half was never built.

This project takes **real card payment for online food orders** via
**Windcave** (NZ gateway, Hosted Payment Page). Because money cannot be taken
against a browser-computed total, roughly half the work is the missing
**server-side order path**, and the rest is the Windcave integration on top.

Scope was confirmed with the user: this is payment for **online food orders**,
not table bookings. The site has no booking feature and publishes
`acceptsReservations: false` (`lib/structured-data.ts:22`); that remains true.

## 2. Goals

- Orders are created **server-side**, with the amount **recomputed on the server**
  from trusted menu prices. The client never determines what is charged.
- Card customers pay through the **Windcave Hosted Payment Page**, then return to
  a server-rendered confirmation backed by the database.
- Payment outcome is captured reliably even if the customer never returns to the
  site, via Windcave's **Fail Proof Result Notification (FPRN)**.
- Cash remains available as a pay-in-person option.
- Unpaid orders never reach the kitchen dashboard.
- The Windcave account details are **documented in-repo** so the onboarding email
  never needs to be re-supplied. Secrets stay out of git.

## 3. Non-Goals (YAGNI)

- **Tokenisation / stored cards / subscriptions.** Windcave supports these; not needed.
- **Refunds.** No admin refund UI. Refunds happen in the Payline portal.
- **Admin order-management UI.** The dashboard stays metrics-only. Staff order
  workflow is a separate milestone.
- **Email/SMS receipts.** Confirmation is the on-screen page only.
- **Apple Pay.** Blocked on the merchant completing domain-registration steps 1–2
  and Windcave issuing a MID. HPP means this can be enabled later with no code change.
- **Drop-In / Hosted Fields.** HPP redirect only this milestone (see §5.1).
- **Production go-live.** Windcave requires eCom certification first (see §12).

## 4. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Server-side orders **and** Windcave together | Smallest change that is safe to take money with |
| Payment surface | Hosted Payment Page redirect | Least code, PCI SAQ A, Apple Pay works on Windcave's domain with no registration blocker |
| Cash | Kept, pay in person | Frictionless option for regulars |
| Source of truth | Server-side query-session | Callback params and FPRN bodies are untrusted triggers |
| Order creation | Before payment | Needed to give Windcave a `merchantReference` and a server-fixed amount |

### 4.1 Why HPP, and how to keep Drop-In cheap later

HPP redirects the customer to Windcave's page. Drop-In embeds Windcave's JS and
keeps them on-site — nicer, but it needs iframe/CSP work and Apple Pay stays
blocked until the merchant's own domain is registered.

The session response's `links` array is therefore **stored and passed through
intact, never reconstructed**. Windcave explicitly recommends this. Switching to
Drop-In later becomes a frontend-only change with no server rework.

## 5. Architecture

### 5.1 Flow

```
Checkout form submit
  └─ server action submitCheckout(payload)
       ├─ re-fetch menu prices from Supabase, rebuild lines, recompute totals (lib/pricing.ts)
       ├─ insert order + order_items via service-role client
       │    reference VK-XXXXXX · public_token · notification_token
       ├─ CASH  → status 'new', payment_status 'unpaid' → redirect /order/{public_token}
       └─ CARD  → status 'pending_payment', payment_status 'pending'
            ├─ POST {WINDCAVE_API_URL}/sessions
            │    Authorization: Basic base64(username:apiKey)
            │    type 'purchase' · amount = server total · currency NZD
            │    merchantReference = reference
            │    callbackUrls {approved,declined,cancelled} → /order/return/{public_token}?outcome=…
            │    notificationUrl → /api/windcave/fprn?t={notification_token}
            ├─ persist session id + links on the order
            └─ return links[rel="hpp"].href → client redirects
```

Two independent paths then converge on **one idempotent function**:

- Customer returns → `/order/return/{token}` → `reconcileSession(orderId)` → redirect `/order/{token}`
- Windcave FPRN POST → `/api/windcave/fprn` → same `reconcileSession(orderId)`

### 5.2 Trust model

`reconcileSession` **always performs a server-side `GET /sessions/{id}`** and
treats only that response as fact. The callback's `outcome` query param and the
FPRN request body are treated purely as *"something happened, go look"* signals.

An order is marked paid only when **both** hold:

1. `transactions[0].authorised === true`, and
2. the session amount **equals the stored order total**.

An amount mismatch refuses the transition and flags the order for manual review
rather than fulfilling it.

FPRN requests are not signed. The `notificationUrl` therefore carries an
unguessable `notification_token`, and — because verification is by query-session
regardless — a forged notification can at worst trigger a redundant lookup.

### 5.3 Security fixes in scope

`supabase/migrations/0004_rls_policies.sql:31` currently grants:

```sql
create policy "orders_anon_insert" on orders for insert with check (true);
```

Anyone holding the public anon key can forge an order at any total. Since all
writes now go through the service-role client behind the server action, this
policy and `order_items_anon_insert` are **dropped**.

`WINDCAVE_API_KEY` is server-only, never `NEXT_PUBLIC_`, and `lib/windcave/*` is
guarded by the `server-only` package so a stray client import fails the build —
matching the existing pattern in `lib/supabase/service-client.ts`.

## 6. Data model — migration `0005_payments.sql`

`orders` gains:

| Column | Type | Notes |
|---|---|---|
| `reference` | `text unique not null` | `VK-XXXXXX`, human-quotable, sent as `merchantReference` |
| `public_token` | `text unique not null` | Opaque; the customer's confirmation URL |
| `notification_token` | `text unique not null` | Separate opaque secret for the FPRN URL |
| `payment_method` | `text check ('card','cash')` | |
| `payment_status` | `text check ('pending','paid','unpaid','failed','cancelled')` | `pending` = card awaiting gateway outcome; `unpaid` = cash owed on collection. Distinct states — one blocks fulfilment, the other does not |
| `windcave_session_id` | `text` | |
| `windcave_transaction_id` | `text` | |
| `paid_at` | `timestamptz` | |
| `email` | `text` | Captured at checkout, currently discarded |
| `address` | `text` | Delivery only |

`orders.status` check constraint gains `pending_payment`.

New `payment_events` table (`order_id`, `kind`, `raw jsonb`, `created_at`) — an
audit trail of every gateway response. Cheap to write and the thing you want when
a payment is disputed or a reconcile misbehaves.

Two distinct tokens are used deliberately: the customer-facing `public_token` gets
shared, screenshotted, and pasted into support chats, so it must not be the same
secret that authenticates the webhook URL.

## 7. Modules

All files stay well under the 200-line guideline.

| File | Purpose |
|---|---|
| `lib/windcave/env.ts` | Validate + expose `WINDCAVE_*`; fail loudly on missing config |
| `lib/windcave/types.ts` | Session request/response types |
| `lib/windcave/client.ts` | `createSession` / `querySession`; Basic auth; 10s timeout; typed errors |
| `lib/windcave/reconcile.ts` | Idempotent session → order status mapping |
| `lib/orders/rebuild-cart.ts` | Untrusted wire lines → trusted `CartLine[]`. The repricing security boundary |
| `lib/orders/create-order.ts` | Validate payload, recompute totals, insert order + items |
| `lib/orders/start-payment.ts` | Compose order + Windcave: open a session, persist it, return the HPP URL |
| `lib/orders/payment-events.ts` | Append-only gateway audit trail; never throws |
| `lib/orders/reference.ts` | `VK-XXXXXX` generation |
| `lib/orders/get-order-by-token.ts` | Confirmation read |
| `app/(site)/checkout/actions.ts` | `submitCheckout` server action |
| `app/(site)/order/return/[token]/route.ts` | Callback landing → reconcile → redirect |
| `app/api/windcave/fprn/route.ts` | FPRN webhook → reconcile |
| `app/(site)/order/[token]/page.tsx` | Server-rendered confirmation |

**Modified:**

- `components/checkout/checkout-form.tsx` — call the server action, handle redirect and errors
- `store/cart-store.ts` — remove the mock `placeOrder`; cart clearing moves to confirmation
- `components/checkout/order-confirmed-view.tsx` — superseded by the server-rendered page
- `lib/db/get-dashboard-metrics.ts` — exclude `pending_payment` from counts and revenue

`supabase/migrations/0004_rls_policies.sql` is **not edited** — it is already
applied. `0005` issues `drop policy` statements for `orders_anon_insert` and
`order_items_anon_insert` instead, so the migration history stays replayable.

`middleware.ts` needs **no change** — its matcher is `/admin/:path*`, so the
callback and FPRN routes are not auth-gated.

`reference.ts` generates 6 crypto-random base32 characters excluding visually
ambiguous ones, with a unique index and regeneration on collision.

## 8. Cart lifecycle

**The cart is not cleared until payment is confirmed.** A declined or cancelled
payment returns the customer to an intact cart and a "Try again" that reuses the
same order row with a **fresh Windcave session**. The cart clears when the
confirmation page loads a paid (or cash) order.

This corrects the current mock, which clears the cart optimistically at submit —
harmless for a fake order, hostile for a real declined card.

## 9. Error handling

| Case | Behaviour |
|---|---|
| Windcave unreachable / 5xx / timeout | Order stays `pending_payment`; inline error; retry available |
| Card declined | Return to checkout with message; retry creates a new session on the same order |
| Customer cancels | Same as declined; cart intact |
| FPRN arrives before the customer returns | Reconcile runs once; the later return is a no-op |
| Duplicate / repeated FPRN | No-op once paid |
| Amount mismatch | Refuse the paid transition; flag for manual review; record in `payment_events` |
| Customer never returns and FPRN fails | Order remains `pending_payment`; visible for manual reconciliation via `payment_events` |

## 10. Testing

Vitest, against **mocked `fetch` — no live gateway calls in CI**:

- Server-side total recomputation, including rejection of a client-tampered amount
- `VK-XXXXXX` reference generation and collision handling
- `authorised` / `reCo` → `payment_status` mapping across approved, declined, and mismatch
- `reconcileSession` idempotency: repeated invocation leaves state unchanged
- Cash branch never contacts Windcave

Manual UAT, documented as a runbook:

- 3DS test card `5588 8800 0007 7770`, SecureCode `123`, any future expiry
- Non-3DS test cards per Windcave's test card page
- FPRN requires a publicly reachable HTTPS URL, so local testing runs through a
  tunnel (cloudflared/ngrok) with `WINDCAVE_NOTIFICATION_BASE_URL` pointed at it;
  a Vercel preview deployment works equally well.

## 11. Environment variables

Added to `.env.example` with **empty values**:

```
# Windcave payment gateway — see docs/windcave-integration.md
WINDCAVE_API_URL=https://uat.windcave.com/api/v1
WINDCAVE_USERNAME=
# Server-only. Generate in Payline. Never commit; never prefix NEXT_PUBLIC_.
WINDCAVE_API_KEY=
WINDCAVE_CURRENCY=NZD
# Public HTTPS base for callback + FPRN URLs. A tunnel in local dev.
WINDCAVE_NOTIFICATION_BASE_URL=
```

The real API key goes in `.env.local` (git-ignored) and in the hosting provider's
environment settings. It is never pasted into the repo, a spec, or chat.

## 12. Documentation deliverable

`docs/windcave-integration.md` — the standing reference, so the onboarding email
never needs to be re-supplied:

- Payline portal URL, username, and password-reset link
- UAT vs production endpoints
- How to generate/roll the API key
- Environment variable table with which value comes from where
- Test cards, including the 3DS card and SecureCode
- Google Pay MID; Apple Pay's outstanding domain-registration steps
- FPRN and query-session behaviour
- **eCom certification is mandatory before production** — the integration cannot
  go live until Windcave's implementation team certifies it

Non-secret identifiers only. The API key is referenced by name, never by value.

Also updated: `.env.example`, `docs/deployment-guide.md`, `docs/features.md`,
`docs/changelog.md`, `docs/system-architecture.md`.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Certification blocks go-live | Flagged up front; submit the eCom certification form early, in parallel with build |
| FPRN untestable locally without a tunnel | Documented tunnel setup; preview deploys as the fallback |
| Menu prices change between cart and submit | Server recomputes from live prices; a changed total is surfaced before payment, not after |
| Orders stuck in `pending_payment` | `payment_events` audit trail; excluded from dashboard so they never reach the kitchen |
| Client-side pricing drift | `lib/pricing.ts` stays the single shared implementation, used by both client display and server authority |

## 14. Open questions

- **Confirmation email.** Deliberately out of scope, but customers on a redirect
  flow have no record of their order beyond one browser tab. Worth a follow-up.
- **Staff order workflow.** Real paid orders will arrive with no UI to work them
  beyond dashboard metrics. Should follow soon after this milestone.
- **Delivery address validation.** Currently a free-text field with no bounds —
  real money makes an out-of-range delivery a refund, not an inconvenience.
