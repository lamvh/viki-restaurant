# System Architecture — Viki

## Overview

Next.js 15 App Router app. Real routes (not a single-page state machine) give real
URLs, SSR content, and refresh/deep-link support. Interactive chrome (header, cart
drawer, item modal, checkout) are client components reading a Zustand store; content
sections (hero, kitchen band, find us) are server components where possible.

## Routes

| Route | Screen | Notes |
|---|---|---|
| `/` | Home | hero, popular dishes, **full inline menu**, our kitchen, delivery zone, find us. ISR 15m |
| `/menu` | Menu | sticky category chips + item rows; opens item modal |
| `/checkout` | Checkout | details + live order summary; submits to the server |
| `/order/[token]` | Order confirmed | server-rendered from the database, `noindex` |
| `/admin` | Overview | KPIs, 7-day sales chart, live kitchen queue, top dishes |
| `/admin/menu` | Menu admin | dish grid + modal editor; drives the public site |
| `/admin/pos` | Counter till | ring up a walk-in, then charge card or cash |
| `/admin/orders` | Staff orders | card list + detail panel; charge or settle cash |
| `/api/admin/terminal/status` | Terminal relay | staff-guarded poll/button proxy |

**Global overlays** (mounted in `app/layout.tsx`, driven by store): cart drawer,
item modal.

**Guards:** `/checkout` with empty cart → `/menu`; unknown `/order/[token]` → 404;
all `/admin/*` gated by `middleware.ts` **and** a per-page `requireStaff()`.

## Admin shell

`app/admin/layout.tsx` resolves the session, counts `new` orders for the nav
badge, and hands both to `AdminShell`. When there is no user it renders children
bare — `/admin/login` lives inside this segment, and wrapping it in the shell
would leave nobody able to sign in.

| Concern | Module |
|---|---|
| Nav model (single source for rail, topbar, tabs) | `lib/admin/nav-items.ts` |
| Chrome + layout preference | `components/admin/layout/admin-shell.tsx` |
| Section title bar (page-owned, for page-specific actions) | `components/admin/layout/admin-page-header.tsx` |
| Status / service badge palettes | `lib/admin/status-meta.ts` |
| Overview aggregation (pure, unit-tested) | `lib/admin/dashboard-aggregate.ts` |

**Layout:** rail (default) or topbar, persisted per device in `localStorage`
under `viki.admin.layout`; below 820px a mobile header plus bottom tabs replace
both. The first paint is always the rail — reading storage during render would
differ between server and client and break hydration.

**Orders selection** lives in the URL (`?status=`, `?service=`, `?order=`), so
the detail panel is server-rendered with no client fetch and any view is
shareable and reloadable.

**Unbuilt sections** (Content, Payments, End of day, Printers) appear in the
admin-only nav group as disabled rows, so the nav never links to a 404.

## Payment

Two channels share one order path.

| Layer | Module |
|---|---|
| Menu source | `lib/db/get-menu.ts` — database, falling back to `data/menu/*` |
| Repricing boundary | `lib/orders/rebuild-cart.ts` — rebuilds lines from the menu it is given |
| Order creation | `lib/orders/create-order.ts` — re-totals, persists via service role |
| Counter sale | `app/admin/pos/actions.ts` — creates then charges, via the same path |
| Terminal (HIT) | `lib/windcave/hit-{env,types,xml,client}.ts` |
| Terminal flow | `lib/orders/terminal-payment.ts` — start, poll, finalise, cash settle |
| Audit trail | `lib/orders/payment-events.ts` → `payment_events` |

**Data flow (card present):** staff action → `startTerminalPayment` persists
`hit_txn_ref` → Purchase XML → browser polls `/api/admin/terminal/status` →
`finaliseTerminalPayment` transitions the order once, conditionally.

**Invariants:** the amount always comes from `orders.total`; the HIT key never
reaches a browser; `TxnRef` is written before the terminal request so an
interrupted sale stays recoverable; every state transition is a conditional
update, so concurrent finalises produce exactly one.

Online card payment (Windcave REST / HPP) is designed and on hold; its columns
already exist in `0005`.

## State (Zustand) — `store/cart-store.ts`

- State: `service` ('pickup' | 'delivery'), `cart: CartLine[]`, `cartOpen`, `modalItemId`.
- Persisted (v1): `service` + `cart` to `localStorage`. Cleared on the confirmation
  page, never at submit — a failed payment must return an intact cart.
- Order placement is **not** here: it is a server action, so the total is computed
  from the menu rather than the browser.
- Transient modal state (selected options, qty, notes) lives locally in the item modal.

## Data & pricing

- `data/menu.ts` — typed menu (6 categories, ~26 items).
- `lib/pricing.ts` — pure pricing module (subtotal, discount at ≥$30, delivery fee,
  total, points, $5 delivery minimum, ETA). No React; locked by unit tests.

## Component map

- `components/layout/` — `promo-bar` (server), `site-header` (client: cart count +
  service toggle, hydration-guarded), `service-toggle` (client), `site-footer` (server).
  Chrome mounts in `app/(site)/layout.tsx`, alongside `components/cart/cart-bar`
  (client sticky order summary, rendered only once the cart is non-empty).
- `components/home/` — `hero`, `kitchen-band`, `find-us`, `dish-card`, `dish-row`
  (server); `popular-dishes`, `home-menu`, `delivery-zone`, `add-to-cart-button`
  (client — category tabs, suburb chips, cart writes); `use-restaurant-hour`
  (client hook, seeded from a server-rendered prop so hydration matches).
  Composed in `app/(site)/page.tsx`.
  The lunch/dinner switch is `lib/home/service-window.ts` (pure, pinned to
  `Pacific/Auckland`); which dishes it locks is `lib/menu/dinner-only.ts`.
- `components/ui/` — `image-slot` (client: real image or placeholder + load fallback),
  `dish-card`, `tag-badge`, `money`.
- `components/menu/` — `category-chips` (client scrollspy), `menu-category` (server),
  `menu-item-row` (client), `item-modal` (client global overlay), `option-group` (client).
- `components/cart/` — `cart-drawer` (client global overlay), `cart-line` (client),
  `order-summary` (client; totals via `lib/pricing`).
- `components/checkout/` — `checkout-form`, `payment-methods`, `checkout-view` (guarded),
  `order-confirmed-view` (guarded) — all client.
- `app/checkout/page.tsx`, `app/order/confirmed/page.tsx` — server pages (`noindex`)
  rendering the guarded client views.
- `lib/use-hydrated.ts` — gates persisted-store display + route guards against SSR
  mismatch. `lib/use-focus-trap.ts` — shared dialog/drawer focus management.
- Overlays (item modal, cart drawer) mount in `app/layout.tsx`, driven by store flags
  (`modalItemId`, `cartOpen`) that are not persisted.

## SEO

As a marketing site, SEO is built in via the Next 15 Metadata API:

- Global metadata in `app/layout.tsx` (`metadataBase`, title template, Open Graph,
  Twitter card, robots, icons).
- Per-page `metadata`/`generateMetadata` with unique title/description/canonical;
  `/checkout` and `/order/confirmed` are `noindex`.
- JSON-LD structured data (Restaurant on home, Menu on `/menu`) derived from
  `data/restaurant.ts` + `data/menu.ts` (kept in a `lib/structured-data.ts` module).
- `app/sitemap.ts` and `app/robots.ts` generate `/sitemap.xml` and `/robots.txt`.
- Canonical origin from `NEXT_PUBLIC_SITE_URL`.

See [`seo-guidelines.md`](./seo-guidelines.md) for the full conventions.

## Toolchain (Phase 01)

- Styling pipeline: `postcss.config.mjs` → `@tailwindcss/postcss`; tokens in
  `app/globals.css` (`@theme` + `:root`).
- Fonts: `next/font/google` exposed as CSS variables on `<html>`.
- Tests: `vitest.config.ts` (jsdom, `@` alias, `vitest.setup.ts` with jest-dom).
