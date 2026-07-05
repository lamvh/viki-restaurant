# Changelog — Viki

All notable changes to this project are recorded here, newest first.

## 2026-07-05

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
