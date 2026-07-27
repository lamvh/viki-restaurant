---
title: "Viki — Online Card Payment (Windcave REST / HPP)"
description: "Online card payment via Windcave Hosted Payment Page: session creation, redirect, callback + FPRN reconciliation"
status: on_hold
priority: P2
effort: 22h
branch: main
tags: [nextjs, supabase, payments, windcave, rest, hpp, fprn]
created: 2026-07-27
---

# Viki — Online Card Payment (Windcave REST / HPP)

> ## ⏸️ ON HOLD
>
> Paused by decision on 2026-07-27 in favour of
> **[terminal payment (HIT)](../20260727-viki-terminal-payment/plan.md)**, which
> runs to completion first.
>
> **Nothing here should be started yet.** The plan is kept current so it can be
> picked up without a re-planning pass.

Lets customers pay by card **online at checkout**, via the Windcave **Hosted
Payment Page**: the server opens a session, the customer is redirected to
Windcave's page, pays, and returns. The outcome is captured reliably even if they
never come back, via **FPRN**.

**Source of truth:** [`docs/superpowers/specs/2026-07-27-viki-online-payment-design.md`](../../docs/superpowers/specs/2026-07-27-viki-online-payment-design.md)

**Account reference:** [`docs/windcave-integration.md`](../../docs/windcave-integration.md)

## Prerequisite — the terminal milestone

This milestone **starts from a finished order path**, which the terminal
milestone builds. By the time it resumes, the following already exist and are
reused unchanged:

| Already built by terminal payment | Reused here |
|---|---|
| Migration `0005` — including `windcave_session_id`, `windcave_transaction_id`, `windcave_links` | **No further schema work needed** |
| `lib/orders/create-order.ts`, `rebuild-cart.ts`, `reference.ts` | Server-computed totals and order identity |
| `lib/orders/payment-events.ts` | Same audit trail, new event kinds |
| `lib/orders/get-order-by-token.ts`, `/order/[token]` | Confirmation page gains paid/failed states |
| `/admin/orders` staff list | Unchanged |

What this milestone adds is the **card channel only**.

## Phases

| # | Phase | Effort | Status | Depends on |
|---|---|---|---|---|
| 01 | [Windcave REST client](./phase-01-windcave-rest-client.md) | 4h | ⏸️ on hold | terminal milestone |
| 02 | [Card branch — session + HPP redirect](./phase-02-session-and-hpp-redirect.md) | 4h | ⏸️ on hold | 01 |
| 03 | [Reconcile — callback + FPRN](./phase-03-reconcile-callback-and-fprn.md) | 6h | ⏸️ on hold | 02 |
| 04 | [Tests, UAT runbook + docs](./phase-04-tests-uat-and-docs.md) | 5h | ⏸️ on hold | 01–03 |

**Total effort:** 22h

**Known gap — not yet written.** A checkout phase covering the card payment
option, the cross-origin redirect, retry-on-decline, and the paid/failed states
on the confirmation page. That content was folded into the terminal milestone's
Phase 05 for the pay-on-collection path only. **Write it when this milestone
resumes** — roughly 5h, slotting between Phases 02 and 03. Phase 01 also needs to
create `lib/windcave/env.ts` (the REST config module), which moved out of the
original Phase 01 when the schema work migrated to the terminal milestone.

## Dependency graph

```
[terminal milestone complete — order path, schema, confirmation page all exist]
     │
     ▼
01 (REST client: createSession, querySession, env config)
     │
     ▼
02 (card branch → HPP redirect)
     │
     ▼
[gap: checkout card option, retry, paid/failed states — to be written]
     │
     ▼
03 (reconcile + /order/return + FPRN webhook)
     │
     ▼
04 (tests, UAT, docs)
```

## Key decisions

- **Query-session is the only source of truth.** Callback query params and FPRN
  bodies are untrusted *"something happened, go look"* triggers, never facts.
- **Paid requires two conditions:** `transactions[0].authorised === true` **and**
  session amount equal to the stored order total. A mismatch refuses the
  transition and flags for manual review.
- **One idempotent `reconcileSession`.** Both the customer return and the FPRN
  webhook converge on it; repeated invocation is a no-op.
- **`links` array stored and passed through intact** — Windcave recommends it, and
  it makes a later Drop-In swap frontend-only.
- **Cart is not cleared until payment is confirmed**, so a declined card returns
  the customer to an intact cart.
- **HPP over Drop-In:** least code, PCI SAQ A, and Apple Pay works on Windcave's
  domain with no domain-registration blocker.

## Key dependencies (external / user-provided)

- **`WINDCAVE_API_KEY`** — generated in Payline, dropped into `.env.local`. This
  is the **REST** key for `VinapageUAT_API`, a **different credential** from the
  terminal milestone's HIT key. See the credential map in
  [`docs/windcave-integration.md`](../../docs/windcave-integration.md).
- A **publicly reachable HTTPS URL** for FPRN + callbacks. Local dev needs a
  tunnel (cloudflared/ngrok) via `WINDCAVE_NOTIFICATION_BASE_URL`; a Vercel
  preview deployment works equally well.

## Out of scope (YAGNI)

Tokenisation / stored cards / subscriptions, refunds (use Payline), email
receipts, Apple Pay (blocked on domain-registration steps 1–2), Drop-In /
Hosted Fields.

## Blocking constraint — production go-live

**Windcave requires eCom certification before this channel may run in
production** — a **separate booking** from the terminal milestone's POS
certification. Submit it early once this resumes.

## Success criteria (milestone done)

1. `build` / `lint` / `test` green; `WINDCAVE_API_KEY` never in a client bundle.
2. A card order redirects to the Windcave hosted page, pays with the 3DS test
   card, returns, and shows `paid`.
3. A declined card leaves the cart intact and offers a working retry.
4. FPRN arriving before, after, or repeatedly alongside the customer's return
   produces exactly one paid order.
5. A forged `?outcome=approved` changes nothing.
6. A tampered client total is rejected.
