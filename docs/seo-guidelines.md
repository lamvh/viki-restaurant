# SEO Guidelines — Viki

Viki's site is a **promotional/marketing site** for the restaurant, so search
discoverability is a first-class requirement. This document defines the SEO
conventions every page must follow.

Implementation uses the **Next.js 15 App Router Metadata API** (static `metadata`
exports and `generateMetadata`), plus route handlers for `sitemap` / `robots` and
inline JSON-LD for structured data.

## 1. Global metadata (`app/layout.tsx`)

Set once on the root layout; pages inherit and override as needed.

- `metadataBase` — absolute base URL (from `NEXT_PUBLIC_SITE_URL`, fallback to the
  production domain) so OG/canonical URLs resolve absolutely.
- `title` — use a **template**: `title: { default: 'Viki — …', template: '%s · Viki' }`.
- `description` — concise, keyword-aware, ~150–160 chars.
- `applicationName`, `keywords`, `authors`, `creator`.
- `openGraph` — `type: website`, `siteName`, `locale: en_NZ`, `url`, `title`,
  `description`, and an OG image (1200×630).
- `twitter` — `card: summary_large_image`, `title`, `description`, `images`.
- `robots` — `index: true, follow: true` (allow indexing in production).
- `icons` — favicon / apple-touch-icon.
- `alternates.canonical` — `'/'` at the root; each page sets its own.

## 2. Per-page metadata

Every route exports `metadata` (or `generateMetadata`) with a **unique** title,
description, and canonical:

| Route | Title | Canonical |
|---|---|---|
| `/` | `Viki — Vietnamese Street Food, Glenfield` (default) | `/` |
| `/menu` | `Menu · Viki` | `/menu` |
| `/checkout` | `Checkout · Viki` + `robots: { index: false }` | `/checkout` |
| `/order/confirmed` | `Order Confirmed · Viki` + `robots: { index: false }` | `/order/confirmed` |

Transactional pages (`/checkout`, `/order/confirmed`) are **noindex** — they hold no
marketing value and can carry per-user state.

## 3. Structured data (JSON-LD)

Inject via a `<script type="application/ld+json">` in server components.

- **Restaurant** schema on the homepage: `@type: Restaurant`, `name`, `servesCuisine:
  Vietnamese`, `address` (PostalAddress — Glenfield Mall, Auckland), `telephone`,
  `openingHoursSpecification` (from `data/restaurant.ts`), `url`, `image`,
  `priceRange`, `acceptsReservations: false`, `hasMenu` → `/menu`.
- **Menu / MenuSection / MenuItem** schema on `/menu`, generated from `data/menu.ts`
  (each category → `MenuSection`, each item → `MenuItem` with `offers.price` in NZD).
- **BreadcrumbList** where nesting exists.

Keep JSON-LD generation in a dedicated module (e.g. `lib/structured-data.ts`) so it is
derived from the same data source as the UI and stays in sync.

## 4. Crawl + indexing files

- `app/sitemap.ts` → generates `/sitemap.xml` listing indexable routes (`/`, `/menu`).
- `app/robots.ts` → generates `/robots.txt`: allow all, disallow `/checkout` and
  `/order/*`, and reference the sitemap.

## 5. On-page SEO hygiene

- **One `<h1>` per page**, logical heading order (already followed).
- Descriptive, unique image `alt` text (via `ImageSlot` `alt`/`label`).
- Semantic landmarks: `header`, `nav[aria-label]`, `main`, `footer`.
- Internal links use real `<Link href>` with descriptive text.
- `lang="en"` on `<html>` (set); use `en-NZ` locale signals in OG.
- Meaningful, human-readable URLs (already: `/menu`, `/order/confirmed`).

## 6. Performance (Core Web Vitals)

Rankings weigh CWV. Keep bundles lean (server components by default, client islands
only for interactivity), use `next/font` (self-hosted, no layout shift — already), and
`next/image` with explicit sizing for real photography when added.

## 7. Environment

- `NEXT_PUBLIC_SITE_URL` — canonical production origin (e.g. `https://viki.co.nz`).
  Used by `metadataBase`, `sitemap`, `robots`, and JSON-LD `url`. Falls back to
  `http://localhost:3000` in development.
  **Gotcha:** `NEXT_PUBLIC_*` values are inlined at **build** time, so this must be set
  in the build environment (not just at runtime) for production URLs to be correct.

## Status

- [x] Global metadata (metadataBase, OG, Twitter, robots) — `app/layout.tsx`
- [x] Per-page canonicals + `noindex` on checkout/confirmed
- [x] JSON-LD: Restaurant (home) + Menu (menu page) — `lib/structured-data.ts`
- [x] `sitemap.ts` + `robots.ts`
- [x] `NEXT_PUBLIC_SITE_URL` wired (`lib/site.ts`, `.env.example`)
- [x] Generated OG/Twitter image (`app/opengraph-image.tsx`, `next/og`)
- [ ] Favicon / apple-touch-icon assets (add real brand icons before launch)

_Added 2026-07-05 per product direction: Viki is a promotional site — SEO is required._
