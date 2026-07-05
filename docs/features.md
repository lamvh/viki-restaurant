# Features — Viki

Status legend: ✅ done · 🚧 in progress · ⬜ pending

| Feature | Description | Status |
|---|---|---|
| Project scaffold | Runnable Next.js 15 app, tooling, tokens, fonts, test harness | ✅ |
| Homepage | Hero, popular dishes, story band, location (1b Fresh) | ✅ |
| Layout chrome | Promo bar, sticky header (cart + service), footer | ✅ |
| Menu page | Sticky category chips (scrollspy) + item rows | ✅ |
| Item modal | Option groups, qty, special instructions; live price | ✅ |
| Cart drawer | Line qty controls, empty state, live totals, focus-trapped | ✅ |
| Checkout | Details + payment + live order summary (pickup & delivery) | ✅ |
| Order confirmation | Success screen reading last order from store | ✅ |
| Pricing engine | Subtotal, ≥$30 discount, delivery fee, points, $5 min, ETA | ✅ |
| Menu data | 6 categories, 27 items, option groups, featured lookup | ✅ |
| Cart store | Zustand: add/inc/dec/remove, service, placeOrder | ✅ |
| Cart persistence | Service + cart + last order via `localStorage` | ✅ |
| Route guards | Empty-cart / no-order redirects (hydration-safe) | ✅ |
| SEO meta | Per-page title/description/canonical, OG + Twitter cards | ✅ |
| Structured data | JSON-LD Restaurant (home) + Menu (menu page) | ✅ |
| Crawl files | `sitemap.xml` + `robots.txt` (noindex transactional pages) | ✅ |
| Social image | Generated OG/Twitter image (next/og, 1200×630) | ✅ |
| Test suite | 46 tests: pricing, store, line-builder + RTL (modal, drawer, summary, guard) | ✅ |
