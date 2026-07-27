# Changelog — Viki

All notable changes to this project are recorded here, newest first.

## 2026-07-27

- **Terminal payment (Windcave HIT):** Card-present payment on the physical
  CHU200TP reader. `lib/windcave/hit-*` speaks the XML protocol (envelope verified
  against the live UAT terminal — see `windcave-integration.md`); staff charge an
  order from `/admin/orders`, the browser polls a staff-guarded relay so the HIT
  key never leaves the server, and the dialog mirrors the terminal's own `DL1`/`DL2`
  prompts and `B1`/`B2` buttons. `TxnRef` is persisted **before** the terminal
  request so a sale interrupted by a closed browser stays recoverable. Cancelling
  works only while the terminal offers a button — HIT has no POS-initiated cancel.
- **Counter till (`/admin/pos`):** staff ring up walk-in customers on a menu grid
  and take payment on the terminal or in cash. This reverses an earlier scope
  decision that only charged pre-existing online orders — backwards for a counter
  reader. Counter sales go through the same `createOrder` path as online ones.
- **Server-side orders:** Checkout is no longer a mock. `submitCheckout` rebuilds
  every cart line from the menu and re-totals through `lib/pricing`, so the client
  cannot influence what is charged; orders and items persist via the service-role
  client. Confirmation moved from `localStorage` to a server-rendered
  `/order/[token]`, so it survives a new device or a shared link.
- **Cart lifecycle fix:** the cart now clears on the confirmation page, not at
  submit. The old mock cleared optimistically — harmless for a fake order, hostile
  for a real failed payment.
- **Security:** dropped the `orders_anon_insert` RLS policy, which let anyone
  holding the public anon key forge an order at any total. Verified: anon insert is
  refused (42501), and anon reads of `orders` / `payment_events` return zero rows
  against a seeded row.
- **Admin password login:** sign-in that needs no Supabase user, HMAC-signed
  session cookie. Disabled in production unless `ADMIN_LOGIN_PASSWORD` is set, so
  no deployment can ship with guessable defaults. Also fixed the admin layout
  blanking `/admin/login` — the login page was unreachable.
- **Schema:** migration `0005_payments.sql` (order identity tokens, payment state,
  HIT + online gateway columns, `payment_events` audit trail).
- Docs: `windcave-integration.md`, `terminal-payment-uat-runbook.md`.

## 2026-07-05

- **SEO & structured data:** Implemented per `seo-guidelines.md`. Global metadata
  (`metadataBase`, title template, Open Graph, Twitter `summary_large_image`, robots,
  canonical) in root layout; per-page canonicals (`/`, `/menu`) and `noindex` on
  `/checkout` + `/order/confirmed`. JSON-LD `Restaurant` (home) and `Menu` (menu page)
  from `lib/structured-data.ts` (derived from restaurant + menu data). Generated
  `sitemap.xml` (`/`, `/menu`), `robots.txt` (disallow `/checkout`, `/order/`), and a
  self-contained `next/og` social image (1200×630). Canonical origin from
  `NEXT_PUBLIC_SITE_URL` (`.env.example` added). Verified on a running server.
- **Component tests + QA:** Added React Testing Library tests for the interactive
  components — item modal (option pricing → store commit, qty), cart drawer (lines,
  empty state, totals, delivery-min disable), order summary (discount/fee/points), and
  a checkout-guard regression test locking the just-placed navigation fix. Suite now 46
  tests (pricing, store, line-builder, 4 RTL files); RTL auto-cleanup wired in
  `vitest.setup.ts`. Responsive layouts are mobile-first (see design-guidelines).
- **Cart, checkout & confirmation:** Global cart drawer (slide-in, focus-trapped) with
  per-line qty controls, empty state, live order summary, and delivery-minimum block.
  `/checkout` (details + payment + sticky summary, client validation, delivery address
  required) and `/order/confirmed` (order number, ETA, total, points) as server pages
  (both `noindex`) rendering guarded client views — empty cart → `/menu`, no last order
  → `/` (guards wait for hydration). Extracted shared `lib/use-focus-trap.ts` (reused by
  modal + drawer). Full ordering flow now complete end-to-end.
- **SEO scope added:** Confirmed Viki is a promotional/marketing site, so SEO is now a
  first-class requirement. Added `docs/seo-guidelines.md` (Next 15 Metadata API
  conventions: per-page meta + canonicals, Open Graph/Twitter cards, JSON-LD Restaurant
  + Menu schema, `sitemap.xml` / `robots.txt`, `NEXT_PUBLIC_SITE_URL`). Registered as
  plan Phase 07. Implementation pending.
- **Menu + item modal:** `/menu` page with sticky category chips (IntersectionObserver
  scrollspy) and tappable item rows. Global item-modal overlay (store-driven via
  `modalItemId`) with option groups (single=radio / multi=checkbox), quantity stepper,
  special instructions, and a live per-line total; "Add to order" commits a CartLine and
  opens the cart. Pure `lib/build-cart-line.ts` implements the label/price/key rules
  (9 unit tests). Store gains transient `modalItemId` + `openItem`/`closeItem` (not persisted).
- **Layout chrome + homepage:** Promo bar, sticky store-wired header (cart count +
  service toggle, hydration-guarded), and footer mounted in root layout. Homepage
  composes hero, popular dishes (featured), story band, and location sections in the
  "1b Fresh" direction. Shared UI primitives: `image-slot` (real/placeholder),
  `dish-card`, `tag-badge`, `money`. Homepage serves 200 with all sections; build clean.
- **Data & logic core:** Typed menu (`data/menu/*`, 6 categories / 27 items, featured
  lookup), pure pricing module (`lib/pricing.ts` — subtotal, ≥$30 discount, delivery
  fee, points, $5 delivery minimum, ETA), money formatter, and Zustand cart store
  (`store/cart-store.ts`) with `localStorage` persistence of service + cart + last
  order. 18 unit tests (pricing + store) pass. Menu content reconstructed to spec §5
  (original source HTML lives in the external design project, not in-repo).
- **Scaffold:** Initial Next.js 15 (App Router) + React 19 + TypeScript project.
  Tailwind v4 CSS-first tokens, Instrument Serif + Hanken Grotesk fonts, ESLint +
  Prettier, Vitest + RTL + jsdom test harness, `next.config` remote image host
  (`assets.foodhub.com`), placeholder homepage, README, and `docs/` skeletons.
  `lint` / `build` / `test` all green on the placeholder page.
