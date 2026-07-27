---
title: "Viki — Terminal Payment (Windcave HIT)"
description: "Shared server-side order path + Windcave HIT: staff charge existing orders on the physical CHU200TP card terminal"
status: pending
priority: P1
effort: 40h
branch: main
tags: [nextjs, supabase, payments, windcave, hit, eftpos, card-present, security]
created: 2026-07-27
---

# Viki — Terminal Payment (Windcave HIT)

Drives Viki's **Windcave CHU200TP countertop card terminal** (station
`3425240086`) so staff can **take card payment on collection** for orders placed
online.

HIT (Host Initiated Transactions) is a card-present channel and works nothing like
the online redirect flow. The app posts XML to `/hit/pos.aspx`, then **long-polls
a Status endpoint** while rendering the terminal's own prompt text (`DL1`/`DL2`)
and soft-button labels (`B1`/`B2`), until `Complete=1`.

**This milestone runs first**, before online card payment. It therefore carries the
**shared order foundation** both channels need — server-side order creation with
server-computed totals, plus a server-rendered confirmation. That is not
online-payment work: today nothing writes an order to the database at all, so HIT
has nothing to charge without it.

**Source of truth:** [`docs/superpowers/specs/2026-07-27-viki-terminal-payment-design.md`](../../docs/superpowers/specs/2026-07-27-viki-terminal-payment-design.md)

**Account reference:** [`docs/windcave-integration.md`](../../docs/windcave-integration.md)

**Next milestone:** [Online card payment](../20260727-viki-online-payment/plan.md) — builds on Phases 01–03 here.

## 🔴 Do this before writing any code

The onboarding email exposed the **`ScrHITKey`** and the **Payline password** for
`VinapageUAT_Payline` in plain text through an untrusted channel.

**Rotate both in Payline before wiring anything up.** Otherwise the first thing
this integration does is authenticate with a leaked key. Neither value is recorded
in any tracked file — identifiers only.

## Phases

**Phases 01–02 exist to answer one question: does the API work, and does the
terminal respond?** Nothing else is built until that is proven. Flow comes after.

| # | Phase | Effort | Status | Depends on |
|---|---|---|---|---|
| 01 | [HIT XML client](./phase-01-hit-xml-client.md) | 5h | ✅ done | — |
| 02 | [**Terminal connection spike**](./phase-02-terminal-connection-spike.md) | 4h | ✅ done | 01 |
| 03 | [Order + payment schema](./phase-03-order-and-payment-schema.md) | 5h | ⬜ pending | 02 |
| 04 | [Server-side order creation](./phase-04-server-side-order-creation.md) | 6h | ⬜ pending | 03 |
| 05 | [Confirmation page + checkout rewiring](./phase-05-confirmation-and-checkout-rewiring.md) | 4h | ⬜ pending | 04 |
| 06 | [Staff order list + charge](./phase-06-staff-orders-and-charge.md) | 5h | ⬜ pending | 05 |
| 07 | [Terminal polling on orders + recovery](./phase-07-terminal-polling-and-recovery.md) | 6h | ⬜ pending | 06 |
| 08 | [Tests, UAT + docs](./phase-08-tests-uat-and-docs.md) | 5h | ⬜ pending | 01–07 |

**Total effort:** 40h — of which the **first 9h reaches a working terminal charge.**

## Dependency graph

```
01 (HIT XML client — no hardware needed)
     │
     ▼
02 (SPIKE: /admin/terminal-test charges $1.00 on the real terminal)  ◄── the goal
     │      credentials proven · envelope proven · device reachable
     ▼
03 (migration 0005: order identity, payment, HIT columns)
     │
     ▼
04 (create-order, pay-on-collection, server-computed totals)
     │
     ▼
05 (public confirmation page, checkout rewiring, cart lifecycle)
     │
     ▼
06 (staff order list, start charge, settle-as-cash)
     │
     ▼
07 (polling on real orders, recovery, spike surface removed)
     │
     ▼
08 (tests, UAT with the terminal, docs)
```

Phase 01 is pure library code needing **no hardware** — start it while the terminal
is still on the bench. Phase 02 is the first thing that needs the physical device
— and **the device is already on hand**, so Phase 02 can run the moment Phase 01
compiles. There is no waiting in this milestone.

## Key decisions

- **Prove the link before building the flow.** Phases 01–02 charge a fixed `$1.00`
  from a throwaway admin screen with no orders and no database. If the envelope,
  credentials, or network path are wrong, that costs an afternoon to find now
  instead of unwinding assumptions baked through five later phases. The spike
  surface is **removed in Phase 07** — it is not left mounted in admin.
- **No split bill, no tipping** (confirmed). The amount-mismatch guard stays as a
  safety net: if it ever fires, tipping was switched on somewhere.
- **`unpaid` and `failed` both mean "not complete"** — neither is terminal. Staff
  get three exits from either: retry the terminal, settle as cash, or read the
  error. Only `paid` completes an order.
- **`TxnRef` is persisted before the POST, not after.** If the browser dies
  mid-transaction the card may still have been charged, and the only way to find
  out is a Status request with the same `TxnRef`. The ref must survive the crash
  that loses the page. This is the card-present equivalent of FPRN.
- **Retry allocates a new `TxnRef`** (`VK-7KQ2X9-2`). Reusing one returns the old
  declined result forever.
- **The browser polls our route, not Windcave.** Keeps `ScrHITKey` server-side and
  lets us re-check staff auth on every tick — an unguarded poll endpoint is a
  remote control for a terminal sitting on a public counter.
- **Amount comes from `orders.total`**, recomputed server-side at order creation.
  The client never determines what is charged.
- **The cart is not cleared until the order is confirmed.** The current mock clears
  it optimistically at submit.
- **One terminal, one station.** Concurrent charges are serialised by a conditional
  update; the loser sees "terminal busy", not a second confusing prompt.
- **Migration `0005` covers both channels**, so the online milestone needs no
  further schema work.

## Security fix folded in

`supabase/migrations/0004_rls_policies.sql:31` grants
`orders_anon_insert … with check (true)` — anyone holding the public anon key can
forge order rows at any total. Harmless while nothing treats orders as real; a
genuine problem the moment a terminal charges against one. Phase 01 drops it via
a **new** `0005` migration; `0004` is already applied and is not edited.

## Key dependencies (external / user-provided)

- **`WINDCAVE_HIT_KEY`** — **rotated** in Payline, then dropped into `.env.local`.
- ✅ The **physical CHU200TP terminal**, station `3425240086` — **received and on
  hand.** Phase 02 needs it powered on and network-reachable; Phases 07–08 UAT
  needs it again.
- Supabase project already provisioned (from the admin milestone).
- New npm dependency: `fast-xml-parser`.

## Out of scope (YAGNI)

Online card payment (next milestone), full counter POS for walk-ins, refunds via
HIT (use Payline), multiple terminals, offline/store-and-forward, email receipts.

## Blocking constraint — production go-live

**Windcave requires POS certification for this card-present channel**, and asks
for as much notice as possible. Book it at the **start** of this milestone, not
the end. Development and UAT need no certification; production does.

This is a **separate booking** from the eCom certification the online milestone
needs.

## Success criteria (milestone done)

0. **Phase 02 gate — the one that matters first:** a `$1.00` test sale runs end to
   end on the physical terminal from `/admin/terminal-test`, proving credentials,
   XML envelope, and device reachability before any flow is built on them.
1. `build` / `lint` / `test` green; `WINDCAVE_HIT_KEY` never in a client bundle.
2. An online order placed as pay-in-person persists server-side and renders a
   server-backed confirmation.
3. Staff can find that order in `/admin/orders` and charge it on the terminal.
4. An approved sale marks the order `paid` with `payment_method='terminal'`.
5. A declined sale leaves the order untouched and retry allocates a new `TxnRef`.
6. **Closing the browser mid-sale is recoverable** — Resume re-polls and reports
   the true outcome.
7. The poll endpoint returns 401 without a staff session.
8. A tampered client total is rejected; the charged amount always matches the
   server recomputation.
9. `docs/windcave-integration.md` covers the terminal, the credential map, and
   both certification bookings.
