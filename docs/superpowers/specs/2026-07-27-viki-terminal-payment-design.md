# Viki — Terminal Payment (Windcave HIT) Design

- **Date:** 2026-07-27
- **Status:** Approved for planning
- **Related:** [2026-07-27 online card payment spec](./2026-07-27-viki-online-payment-design.md) · [2026-07-22 admin dashboard spec](./2026-07-22-viki-admin-design.md)
- **Account reference:** [`docs/windcave-integration.md`](../../windcave-integration.md)

## 1. Summary

Viki has a Windcave **CHU200TP countertop card terminal** (SCR, station
`3425240086`). This project drives it from the app using Windcave **HIT** (Host
Initiated Transactions) so staff can **take card payment on collection** for
orders placed online.

HIT is a card-present channel and is nothing like the online redirect flow. The
POS posts XML to `https://uat.windcave.com/hit/pos.aspx`, then **long-polls a
Status endpoint** while rendering the terminal's own prompt text (`DL1`/`DL2`)
and soft-button labels (`B1`/`B2`), until `Complete=1`. Stateful and chatty,
where the online flow is fire-and-forget.

**This milestone runs first, before online card payment.** It therefore carries
the **shared order foundation** both channels need: server-side order creation
with server-computed totals, and a server-rendered confirmation. That foundation
is not online-payment work — it is plumbing HIT cannot function without, because
today nothing ever writes an order to the database.

## 2. Goals

- Staff charge an existing order to the physical terminal from `/admin/orders`.
- Orders are created **server-side** with the amount **recomputed on the server**.
  The client never determines what is charged.
- A transaction interrupted by a closed browser is **recoverable** — the card may
  have been charged, and the app must be able to find out.
- Staff can always resolve an incomplete order: retry the terminal, settle it as
  cash, or see a clear error. No order gets stuck with no way forward.
- The `ScrHITKey` never reaches a browser.
- Terminal account details are documented in-repo; secrets are not.

## 3. Non-Goals (YAGNI)

- **Online card payment.** Separate milestone, built on this foundation.
- ~~**Full counter POS.**~~ **Reversed 2026-07-27.** The original scope only
  charged orders that already existed online. That was wrong for the actual use:
  a card terminal on a counter serves walk-in customers, and requiring them to
  order online first inverts the flow. `/admin/pos` now rings up counter sales
  directly. It reuses `createOrder`, so pricing, the audit trail and
  interrupted-sale recovery are shared rather than forked.
- **Refunds via HIT.** `TxnType=Refund` exists; use Payline for now.
- **Multiple terminals.** One station, hardcoded from config.
- **Offline/store-and-forward.** If the terminal is unreachable, payment fails and
  is retried.
- **Email receipts.** The terminal prints its own.

## 4. Decisions

| Decision         | Choice                                             | Rationale                                                                          |
| ---------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Scope            | Charge existing orders on collection               | Reuses the order, reference, and amount; no POS invented                           |
| Sequencing       | Before online card payment                         | Terminal is physical and idle otherwise; card-present is the simpler certification |
| Order foundation | Inside this milestone                              | HIT cannot work without it; it is shared plumbing, not online-payment work         |
| Polling          | Browser polls our route; our server polls Windcave | Keeps `ScrHITKey` server-side and lets us re-check staff auth every tick           |
| XML              | `fast-xml-parser` dependency                       | Hand-rolling a parser for a payment protocol is not worth it                       |
| Retry            | New `TxnRef` per attempt                           | Reusing one returns the old declined result forever                                |

## 5. Architecture

### 5.1 Flow

```
Staff opens /admin/orders → picks an unpaid order → "Take card payment"
  └─ startTerminalPayment(orderId)                    [staff-guarded]
       ├─ amount read from orders.total (never the request)
       ├─ TxnRef = "{reference}-{attempt}"  ← PERSISTED BEFORE THE POST
       └─ POST XML → /hit/pos.aspx
            TxnType=Purchase · Station=3425240086 · Amount · Cur=NZD

  └─ browser polls /api/admin/terminal/status every ~1s  [staff-guarded]
       └─ server POSTs TxnType=Status XML with the same TxnRef
            ├─ renders DL1/DL2 prompt text to the staff screen
            ├─ renders B1/B2 as buttons when the terminal offers them
            └─ repeats until Complete=1

  └─ Result authorised → payment_status='paid', payment_method='terminal', paid_at
```

### 5.2 Why `TxnRef` is persisted before the POST

If the browser dies mid-transaction, **the card may still have been charged.**
The only way to find out is a Status request carrying the same `TxnRef` — so the
ref must survive the crash that loses the page. Writing it after the POST leaves
a window where money moved and the app has no idea.

This is the card-present equivalent of the online channel's FPRN: the mechanism
that makes the outcome knowable when the happy path is interrupted.

### 5.3 Trust and authorisation

- **Amount comes from `orders.total`**, recomputed server-side at order creation.
- **Every poll re-checks staff auth.** An unguarded poll endpoint is a remote
  control for a card terminal sitting on a public counter.
- `ScrHITKey` is server-only, never `NEXT_PUBLIC_`, and `lib/windcave/*` carries
  the `server-only` guard.
- **One terminal, one station.** Concurrent charge attempts on the same order are
  serialised by a conditional update; the loser is told the terminal is busy
  rather than being shown a second confusing prompt.

### 5.4 Security fix inherited from the shared foundation

`supabase/migrations/0004_rls_policies.sql:31` grants
`orders_anon_insert … with check (true)` — anyone with the public anon key can
forge orders at any total. Harmless while nothing treats orders as real; a real
problem the moment a terminal charges against one. Dropped in Phase 01.

## 6. Data model

Migration `0005_payments.sql` covers **both** channels, so the online milestone
needs no further schema work.

`orders` gains `reference`, `public_token`, `notification_token`,
`payment_method`, `payment_status`, `paid_at`, `email`, `address`, plus the
online channel's `windcave_session_id` / `windcave_transaction_id` /
`windcave_links` (unused until the next milestone), plus HIT's **`hit_txn_ref`**
and **`hit_attempt`**.

`payment_method` accepts `card` | `cash` | `terminal`. An order placed online as
`cash` becomes `terminal` when actually charged on the reader.

`orders.status` gains `pending_payment`.

`payment_events` (order_id, kind, raw jsonb, created_at) audits every gateway
interaction across both channels. Every terminal attempt logs here, so no
separate attempts table is needed.

## 7. Modules

| File                                     | Purpose                                                             |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `lib/windcave/hit-env.ts`                | Validate + expose `WINDCAVE_HIT_*`; fail loudly                     |
| `lib/windcave/hit-types.ts`              | Request/response and status-stage types                             |
| `lib/windcave/hit-client.ts`             | XML build/parse, POST to `/hit/pos.aspx`, timeout, typed errors     |
| `lib/orders/rebuild-cart.ts`             | Untrusted wire lines → trusted `CartLine[]`. The repricing boundary |
| `lib/orders/create-order.ts`             | Validate, recompute totals, insert order + items                    |
| `lib/orders/reference.ts`                | `VK-XXXXXX` and opaque token generation                             |
| `lib/orders/payment-events.ts`           | Append-only audit trail; never throws                               |
| `lib/orders/get-order-by-token.ts`       | Public confirmation read                                            |
| `lib/orders/terminal-payment.ts`         | Start / poll / finalise a terminal charge                           |
| `lib/db/list-orders.ts`                  | Staff order list read                                               |
| `app/(site)/checkout/actions.ts`         | `submitCheckout` server action                                      |
| `app/(site)/order/[token]/page.tsx`      | Server-rendered confirmation                                        |
| `app/admin/orders/page.tsx`              | Staff order list                                                    |
| `app/api/admin/terminal/status/route.ts` | Staff-guarded poll endpoint                                         |

## 8. Error handling

| Case                                      | Behaviour                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| Terminal offline / unreachable            | Order untouched; error shown; retry available                          |
| Staff cancels via B1/B2                   | Declined; order untouched                                              |
| Card declined                             | Retry allocates a **new** `TxnRef`                                     |
| Browser closed mid-transaction            | Order shows "payment in progress"; Resume re-polls the stored `TxnRef` |
| Two staff charge the same order           | Conditional update; loser sees "terminal busy"                         |
| Poll endpoint hit without a staff session | 401; no terminal interaction                                           |
| Amount mismatch in the result             | Refuse the paid transition; record for manual review                   |

## 9. Testing

Vitest against mocked `fetch` — **no live terminal calls in CI**:

- XML build/parse round-trip, including `DL1`/`DL2`/`B1`/`B2` extraction
- `Complete=0` → keep polling; `Complete=1` → finalise
- Authorised result → paid; declined → order untouched
- Amount mismatch refuses the transition
- `TxnRef` allocation increments per attempt
- Repeated finalise is idempotent

Manual UAT with the physical terminal: approved sale, declined sale, staff
cancel, terminal unplugged mid-sale, browser closed mid-sale then resumed.

## 10. Environment variables

```
WINDCAVE_HIT_URL=https://uat.windcave.com/hit/pos.aspx
WINDCAVE_HIT_USER=VinapageUAT_HIT
# Server-only. Rotate in Payline before first use. Never commit.
WINDCAVE_HIT_KEY=
WINDCAVE_HIT_STATION=3425240086
WINDCAVE_HIT_POS_NAME=Viki
```

## 11. Credential hygiene — action required

The onboarding email exposed the **`ScrHITKey`** and the **Payline password** for
`VinapageUAT_Payline` in plain text through an untrusted channel. **Both must be
rotated in Payline before this integration is wired up.** Otherwise the first
thing the new code does is authenticate with a leaked key.

Neither value appears in this spec, in `docs/windcave-integration.md`, or in any
tracked file. Identifiers only.

## 12. Certification — two separate bookings

- **POS certification** for this card-present channel. Windcave asks for as much
  notice as possible; book it early.
- **eCom certification** for the online channel, in the next milestone.

Neither blocks development or UAT. Both block production.

## 13. Risks

| Risk                              | Mitigation                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------- |
| Card charged but app never learns | `TxnRef` persisted pre-POST; Resume re-polls                                  |
| Leaked HIT key                    | Rotate before first use; documented in §11                                    |
| Terminal arrives late or DOA      | Client and XML layers are unit-testable without hardware; only UAT is blocked |
| Polling load                      | ~1s interval only while a charge is active, never idle                        |
| POS certification delay           | Book at milestone start, not at the end                                       |

## 14. Resolved by the user

- **No split bill.** One order, one payment, full amount. The terminal is never
  asked for a partial amount.
- **No tipping.** Confirmed off for this MID. This matters because a tip would
  push the authorised amount above `orders.total` and trip the amount-mismatch
  guard on every sale. The guard stays in place as a safety net — if it ever
  fires, tipping has been switched on somewhere and needs turning back off.
- **`unpaid` and `failed` both mean "not complete."** Neither is terminal. Staff
  have three exits from either state:
  1. **Retry** the terminal charge (new `TxnRef`),
  2. **Settle as cash** — mark paid with `payment_method='cash'`,
  3. **See the error** and escalate.

  Only `paid` completes an order.

## 15. Open questions

- **Which orders are chargeable?** Any order with `payment_status` of `unpaid` or
  `failed`. Charging a *walk-in* with no prior online order is the full-POS scope
  explicitly deferred here.
- **Who may settle as cash?** Currently any staff role. If cash settlement should
  be admin-only — it is the one action that marks money received without a
  gateway record — say so and it becomes a `requireAdmin()` call.
