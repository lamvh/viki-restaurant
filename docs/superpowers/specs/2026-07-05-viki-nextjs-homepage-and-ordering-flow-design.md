# Viki — Next.js Homepage & Ordering Flow — Design Spec

**Date:** 2026-07-05
**Status:** Approved (architecture) → pending spec review → implementation plan
**Source design:** Claude Design project `b43bb00c-654f-446f-9ffd-7dd088e3236f` — "Viki Vietnamese Street Food UI revamp"
- `Viki Homepage Directions.dc.html` — 3 homepage directions + a 6-screen flow preview
- `Viki Order Online.dc.html` — full interactive ordering app (menu data + business logic)

---

## 1. Summary

Build the base structure and first full milestone of the **Viki** client website — a Vietnamese street-food restaurant (Glenfield Mall, Auckland) — as a **new, fully standalone Next.js project**. It is a self-contained repository with its own git history, `package.json`, and toolchain.

Scope for this milestone: the **homepage** plus the **complete ordering flow** (menu, item customisation, cart, checkout, confirmation), implementing the chosen **"1b — Fresh"** visual direction.

Key insight: the "1b Fresh" homepage and the ordering app's "Home" view are the **same page** (identical hero, popular dishes, story band, location). There is one homepage, and it is the entry point to the ordering flow.

---

## 2. Decisions (confirmed with user)

| Decision | Choice |
|---|---|
| Visual direction | **1b — Fresh** (white, airy grid, herb-green `#2F6B4F` accent, product-forward) |
| Scope | Homepage **+ full 6-screen ordering flow** |
| Location | **Standalone project** (`viki-restaurant`) — self-contained repo; own git history + `package.json` |
| State management | **Zustand** (cart/service/UI state, `localStorage`-persisted) |
| Testing | **Vitest unit tests** (pricing + cart store) **+ React Testing Library** component tests |
| Documentation | **Living docs** maintained under `docs/` from day one (see §9) |

---

## 3. Stack

- **Next.js 15 (App Router)** + **React 19** + **TypeScript**
- **Tailwind CSS v4** with Viki design tokens as CSS variables
- **Fonts:** `next/font/google` — Instrument Serif (display) + Hanken Grotesk (body)
- **State:** Zustand + `persist` middleware (`localStorage`)
- **Testing:** Vitest + @testing-library/react + jsdom
- **Lint/format:** ESLint (`next/core-web-vitals`) + Prettier

### Design tokens (from 1b)
- `--color-brand: #2F6B4F` (herb green — primary CTA/accent)
- `--color-ink: #141414` (near-black — text, secondary buttons)
- `--color-muted: #767676`, `--color-subtle: #5a5a5a`
- `--color-line: #ececec` / `#e2e2e2` (borders)
- `--color-surface: #ffffff`, `--color-surface-alt: #fafafa`
- Display serif: Instrument Serif; body: Hanken Grotesk
- Radii: cards 16px, buttons 10–11px, pills 999px

---

## 4. Routing

Real routes (not a single-page state machine) — gives real URLs, SSR content, refresh/deep-link support:

| Route | Screen | Notes |
|---|---|---|
| `/` | Home | hero, popular dishes, story band, location |
| `/menu` | Menu | sticky category chips + item rows; opens item modal |
| `/checkout` | Checkout | details + payment + live order summary |
| `/order/confirmed` | Order confirmed | success; reads last order from store |

**Global overlays** (rendered in root layout, driven by store):
- **Cart drawer** — slide-in from right, available on every page
- **Item modal** — bottom-sheet with option groups, qty, special instructions

Guards: `/checkout` with an empty cart redirects to `/menu`; `/order/confirmed` with no last order redirects to `/`.

---

## 5. Data & business logic (testable core)

### Menu — `data/menu.ts`
Typed port of the `MENU` array. 6 categories, ~26 items:
`Street Food · Salads · Phở & Noodle Soups · Rice & Noodle Mains · Bánh Mì · Drinks & Dessert`

Item shape:
```ts
type OptionChoice = { id: string; label: string; price: number };
type OptionGroup  = { id: string; title: string; type: 'single' | 'multi'; choices: OptionChoice[] };
type MenuItem     = { id: string; name: string; desc: string; price: number; tags?: Tag[]; groups?: OptionGroup[] };
type MenuCategory = { id: string; name: string; items: MenuItem[] };
type Tag = 'GF' | 'DF' | 'VEG' | 'R18';
```
Featured (Popular right now) = `['phobo','lcsalad','porkbm']`.

### Pricing — `lib/pricing.ts` (pure, no React)
Ported exactly from the source `totals()`:
- `subtotal = Σ(unitPrice × qty)` where `unitPrice = basePrice + selected option prices`
- `hasDiscount = subtotal >= 30` → `discount = subtotal × 0.10`
- `fee = service === 'delivery' && subtotal > 0 ? 4 : 0`
- `total = subtotal − discount + fee`
- `points = round((subtotal − discount) × 10)`
- Delivery minimum order = `$5` (block checkout / show note when `delivery && 0 < subtotal < 5`)
- ETA: pickup `15–20 min`, delivery `30–40 min`
- Money format: `$` + 2 decimals

### Cart line model
```ts
type CartLine = { key: string; id: string; name: string; unit: number; qty: number; labels: string[]; notes: string };
```
`labels` = selected option labels (single-choice labels only when the group has >1 choice; all multi-choice labels). `unit` already includes option prices.

---

## 6. State (Zustand store) — `store/cart-store.ts`

State: `service: 'pickup' | 'delivery'`, `cart: CartLine[]`, `cartOpen: boolean`, `lastOrder: Order | null`.
UI-only modal state (`modalItem`, qty, selected options, notes) lives in the item-modal component (transient), committing to the store on "Add to order".

Actions: `setService`, `addLine`, `incLine(key)`, `decLine(key)` (removes at 0), `clearCart`, `openCart`/`closeCart`, `placeOrder()` → builds `Order` (number `VK-####`, total, points, service, eta), clears cart, sets `lastOrder`.

Derived selectors: `count`, `totals()` (delegates to `lib/pricing.ts`).

Persist `service` + `cart` to `localStorage` (survives refresh). `lastOrder` also persisted so `/order/confirmed` survives refresh.

---

## 7. Component structure

Kebab-case filenames; each file < 200 lines; composition over large components.

```
viki-restaurant/            # standalone project root (own git repo)
  app/
    layout.tsx                # fonts, promo bar, header, footer, cart drawer + modal mounts
    page.tsx                  # Home
    menu/page.tsx             # Menu
    checkout/page.tsx         # Checkout
    order/confirmed/page.tsx  # Success
    globals.css               # Tailwind + design tokens
  components/
    layout/    promo-bar · site-header · service-toggle · site-footer
    home/      hero · popular-dishes · story-band · location-block
    menu/      category-chips · menu-category · menu-item-row · item-modal · option-group
    cart/      cart-drawer · cart-line · order-summary
    checkout/  checkout-form · payment-methods
    ui/        image-slot · dish-card · tag-badge · money
  store/       cart-store.ts
  data/        menu.ts
  lib/         pricing.ts · format.ts
  types/       menu.ts · cart.ts
  docs/        (living docs — see §9)
```

`<ImageSlot>`: renders a real image when `src` is provided (hero, map, logo use the design's foodhub URLs), otherwise a styled placeholder box showing the label. Supports `shape` (rect/rounded), `radius`, and sizing via className. External image hosts allowed via `next.config` `remotePatterns` (`assets.foodhub.com`).

Header, footer, cart drawer, and item modal are **client components** reading the store; content sections (hero, story, location) are **server components** where possible.

---

## 8. Testing

- **`lib/pricing.ts`** — unit tests: discount boundary at exactly `$30`, no discount below, delivery fee only on delivery with subtotal > 0, `$5` delivery minimum note logic, points rounding, empty-cart totals.
- **`store/cart-store.ts`** — add/inc/dec/remove-at-zero, service switch, `placeOrder` clears cart + sets `lastOrder` + points.
- **Component (RTL):** `item-modal` (option selection changes line price; add commits to store), `cart-drawer` (qty controls, empty state, totals), `order-summary` (discount/fee/total rendering).

All tests must pass before the milestone is considered done (no skipped/faked tests).

---

## 9. Documentation plan (living docs)

Per user directive to document all process and features, the project's `docs/` directory is maintained from the first commit and updated as features land. This design spec already lives inside the project (`docs/superpowers/specs/`), so all Viki docs are co-located with the app:

- `project-overview.md` — what Viki is, scope, milestones
- `system-architecture.md` — routes, state flow, component map, data/pricing model
- `codebase-summary.md` — directory guide, conventions
- `features.md` — feature list with status (homepage, menu, item modal, cart, checkout, confirmation)
- `design-guidelines.md` — tokens, typography, spacing, the 1b direction reference
- `changelog.md` — dated record of changes/features/fixes
- `README.md` (app root) — setup, scripts, dev/build/test commands

The implementation plan will include a docs-update step in each phase.

---

## 10. Out of scope (this milestone)

Real backend / order persistence / payments (checkout is UI + client validation; "Place order" produces a mock order number). Auth & real loyalty accounts. Real photography (placeholders/`ImageSlot`). i18n. Directions 1a and 1c. Delivery address geocoding / live ETA. Admin.

---

## 11. Success criteria

1. `viki-restaurant/` is a runnable Next.js app (`dev`, `build`, `start`, `lint`, `test` scripts).
2. Homepage renders the full 1b design, responsive, with placeholder imagery.
3. Full flow works: browse menu → customise item in modal → add to cart → adjust cart → checkout (pickup & delivery) → confirmation, with correct pricing/discount/fee/points at every step.
4. Cart persists across refresh; guards redirect correctly.
5. All Vitest + RTL tests pass.
6. `viki-restaurant/docs/` populated per §9.

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Pricing regressions vs. source logic | Port `totals()` verbatim into pure functions; lock behaviour with unit tests. |
| Over-re-rendering with an interactive cart | Zustand selector subscriptions; keep transient modal state local. |
| Tailwind v4 setup friction (new major) | Standard `@tailwindcss/postcss` setup; tokens as CSS variables; fall back to v3 only if blocked (note if so). |
| External image hosts blocked by Next | Configure `remotePatterns`; `ImageSlot` degrades to placeholder if load fails. |
| Scope creep from the "app" nature | Backend/payments explicitly out of scope; mock order on place. |

---

## 13. Open questions

None blocking. Tailwind v4-vs-v3 is a mitigated implementation detail, not a design decision.
