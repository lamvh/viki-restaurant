---
title: "Viki — Next.js Homepage & Ordering Flow"
description: "Standalone Next.js 15 restaurant site: 1b Fresh homepage + full ordering flow"
status: pending
priority: P2
effort: 24h
branch: main
tags: [nextjs, typescript, tailwind, zustand, restaurant]
created: 2026-07-05
---

# Viki — Next.js Homepage & Ordering Flow

Standalone Next.js 15 (App Router) + React 19 + TS restaurant site for **Viki**, a
Vietnamese street-food spot (Glenfield Mall, Auckland). Implements the approved
**"1b — Fresh"** visual direction: homepage + complete ordering flow (menu →
item modal → cart → checkout → confirmation) with client-side pricing/loyalty logic.

**Source of truth:** [`docs/superpowers/specs/2026-07-05-viki-nextjs-homepage-and-ordering-flow-design.md`](../../docs/superpowers/specs/2026-07-05-viki-nextjs-homepage-and-ordering-flow-design.md)

## Phases

| # | Phase | Effort | Status | Depends on |
|---|---|---|---|---|
| 01 | [Project scaffold & tooling](./phase-01-project-scaffold-and-tooling.md) | 3h | ✅ complete | — |
| 02 | Data & logic core (testable) | 5h | ✅ complete | 01 |
| 03 | Layout chrome + homepage | 4h | ✅ complete | 01, 02 |
| 04 | [Menu + item modal](./phase-04-menu-and-item-modal.md) | 4h | pending | 02, 03 |
| 05 | [Cart drawer + checkout + confirmation](./phase-05-cart-checkout-confirmation.md) | 5h | pending | 02, 03, 04 |
| 06 | [Component tests + docs + responsive QA](./phase-06-tests-docs-responsive-qa.md) | 3h | pending | 03, 04, 05 |

**Total effort:** 24h

## Dependency graph

```
01 ──► 02 ──► 03 ──► 04 ──► 05 ──► 06
         └────────────┴──────┘
02 (data/logic) unblocks 03/04/05 (UI reads store + pricing).
03 (layout chrome) unblocks 04/05 (cart drawer + modal mount live in root layout).
06 validates the fully-composed flow; runs last.
```

## Key cross-cutting decisions

- **Real routes** (`/`, `/menu`, `/checkout`, `/order/confirmed`) — not a single-page state machine. SSR content + deep-link + refresh support.
- **Global overlays** (cart drawer, item modal) mounted in `app/layout.tsx`, driven by Zustand store.
- **Pricing is a pure module** (`lib/pricing.ts`) ported verbatim from the source `totals()`; locked by unit tests before any UI consumes it.
- **Server vs client split:** content sections (hero, story, location) server components; interactive chrome (header, cart drawer, item modal, checkout form) client components.
- **Persistence:** `service` + `cart` + `lastOrder` persisted to `localStorage` via Zustand `persist`.

## Out of scope (this milestone)

Real backend / order persistence / payments (mock order number `VK-####`), auth &
real loyalty accounts, real photography (placeholders via `ImageSlot`), i18n,
directions 1a/1c, delivery geocoding / live ETA, admin.

## Success criteria (milestone done)

1. Runnable app: `dev`, `build`, `start`, `lint`, `test` scripts all green.
2. Homepage renders full 1b design, responsive, placeholder imagery.
3. Full flow correct end-to-end pickup **and** delivery (pricing/discount/fee/points).
4. Cart persists across refresh; route guards redirect correctly.
5. All Vitest + RTL tests pass (no skipped/faked).
6. `docs/` populated per spec §9.
