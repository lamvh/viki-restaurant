# Features — Viki

Status legend: ✅ done · 🚧 in progress · ⬜ pending

| Feature | Description | Status |
|---|---|---|
| Project scaffold | Runnable Next.js 15 app, tooling, tokens, fonts, test harness | ✅ |
| Homepage | Hero, popular dishes, full inline menu, kitchen band, delivery zone, find us | ✅ |
| Delivery zone checker | Suburb chips → in/out of the 6 km zone. Guidance only; checkout is not gated | ✅ |
| Service window | Dinner-only dishes lock until 5pm, on the restaurant's clock | ✅ |
| Layout chrome | Green promo bar, sticky header (anchors + service + cart), dark footer, sticky cart bar | ✅ |
| Menu page | Sticky category chips (scrollspy) + item rows | ✅ |
| Item modal | Option groups, qty, special instructions; live price | ✅ |
| Cart drawer | Line qty controls, empty state, live totals, focus-trapped | ✅ |
| Checkout | Details + live order summary; submits to the server | ✅ |
| Order confirmation | Server-rendered `/order/[token]`, read from the database | ✅ |
| Pricing engine | Subtotal, ≥$30 discount, delivery fee, points, $5 min, ETA | ✅ |
| Menu data | 6 categories, 27 items, option groups, featured lookup | ✅ |
| Cart store | Zustand: add/inc/dec/remove, service (order placement is server-side) | ✅ |
| Cart persistence | Service + cart via `localStorage` (v1: cleared on confirmation) | ✅ |
| Route guards | Empty-cart redirect (hydration-safe) | ✅ |
| Server-side orders | Prices rebuilt from the menu; orders persisted to Supabase | ✅ |
| Staff order list | `/admin/orders` — charge to terminal, settle as cash | ✅ |
| Order management | Kitchen flow new → preparing → ready → completed, cancel, status filters | ✅ |
| Menu management | `/admin/menu` — edit name/description/price, hide, feature, add, delete | ✅ |
| DB-backed menu | Public site, till and pricing all read the database (static file is the fallback) | ✅ |
| Counter till | `/admin/pos` — ring up a walk-in, charge card or cash | ✅ |
| Terminal payment | Windcave HIT on the CHU200TP; poll, buttons, recovery | ✅ |
| Payment audit trail | `payment_events` records every terminal interaction | ✅ |
| Admin password login | HMAC session; off in production without an explicit password | ✅ |
| Online card payment | Windcave REST / Hosted Payment Page | ⬜ on hold |
| POS certification | Required by Windcave before production go-live | ⬜ pending |
| SEO meta | Per-page title/description/canonical, OG + Twitter cards | ✅ |
| Structured data | JSON-LD Restaurant (home) + Menu (menu page) | ✅ |
| Crawl files | `sitemap.xml` + `robots.txt` (noindex transactional pages) | ✅ |
| Social image | Generated OG/Twitter image (next/og, 1200×630) | ✅ |
| Test suite | 46 tests: pricing, store, line-builder + RTL (modal, drawer, summary, guard) | ✅ |
