# System Architecture — Viki

## Overview

Next.js 15 App Router app. Real routes (not a single-page state machine) give real
URLs, SSR content, and refresh/deep-link support. Interactive chrome (header, cart
drawer, item modal, checkout) are client components reading a Zustand store; content
sections (hero, story, location) are server components where possible.

## Routes

| Route | Screen | Notes |
|---|---|---|
| `/` | Home | hero, popular dishes, story band, location |
| `/menu` | Menu | sticky category chips + item rows; opens item modal |
| `/checkout` | Checkout | details + payment + live order summary |
| `/order/confirmed` | Order confirmed | reads last order from store |

**Global overlays** (mounted in `app/layout.tsx`, driven by store): cart drawer,
item modal.

**Guards:** `/checkout` with empty cart → `/menu`; `/order/confirmed` with no last
order → `/`.

## State (Zustand) — `store/cart-store.ts`

- State: `service` ('pickup' | 'delivery'), `cart: CartLine[]`, `cartOpen`, `lastOrder`.
- Persisted: `service` + `cart` + `lastOrder` to `localStorage`.
- Transient modal state (selected options, qty, notes) lives locally in the item modal.

## Data & pricing

- `data/menu.ts` — typed menu (6 categories, ~26 items).
- `lib/pricing.ts` — pure pricing module (subtotal, discount at ≥$30, delivery fee,
  total, points, $5 delivery minimum, ETA). No React; locked by unit tests.

## Component map

- `components/layout/` — `promo-bar` (server), `site-header` (client: cart count +
  service toggle, hydration-guarded), `service-toggle` (client), `site-footer` (server).
  Chrome mounts in `app/layout.tsx`.
- `components/home/` — `hero`, `popular-dishes`, `story-band`, `location-block` (server);
  composed in `app/page.tsx`.
- `components/ui/` — `image-slot` (client: real image or placeholder + load fallback),
  `dish-card`, `tag-badge`, `money`.
- `lib/use-hydrated.ts` — client hook gating persisted-store display to avoid SSR
  hydration mismatch.
- Cart drawer + item modal overlays: _added in Phases 04–05._

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
