# Phase 03 — Data-Access Layer + Public Rewiring

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-22-viki-admin-design.md](../../docs/superpowers/specs/2026-07-22-viki-admin-design.md) (§4.4 lib/db, §8 public rewiring, §14 risks)
- Depends on: 01 (schema/clients), 02 (role guard for write helpers)
- Unblocks: 04, 05, 06, 07, 08

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Build `lib/db/` — the single boundary that maps DB rows → existing domain types so public components keep their props. Convert `/menu` + home popular-dishes to async server components reading `lib/db` (ISR `revalidate=60`), and persist orders from the public checkout. `data/menu/*` + `data/restaurant.ts` become seed/fallback only.

## Key Insights
- Public components MUST keep current props (`MenuCategory`/`MenuItem` from `types/menu.ts`). Mapper converts `menu_items.slug→id`, `description→desc`, `image_url→image`, nests `option_groups`+`option_choices` into `groups`. This is where DB snake_case meets domain camelCase.
- `getFeaturedItems()` replaces `FEATURED_IDS`/`featuredItems()` (currently `data/menu.ts:15,22`) — driven by `menu_items.is_featured`.
- Order persistence: existing checkout builds `lastOrder` in the Zustand store (client) and navigates to `/order/confirmed` (`order-confirmed-view.tsx`). New flow POSTs the cart (`CartLine[]` from `types/cart.ts`) to `POST /api/orders` BEFORE showing confirmation; server recomputes totals with `lib/pricing.ts` (never trusts client totals), writes `orders`+`order_items` (frozen snapshot), returns the persisted order number.
- **Service value mismatch (open Q):** existing toggle is `pickup`/`delivery` (`types/cart.ts:3`); spec §5 orders.service examples say `dine-in`/`pickup`. `orders.service` is free `text` so both persist, but pick ONE vocabulary. Recommend persisting the existing `Service` (`pickup`/`delivery`) to avoid client changes; flag for user.
- **Fallback:** each read helper wraps Supabase call; on error or missing env, returns static `data/menu/*` / `data/restaurant.ts` so public site never hard-fails (spec §14).
- Order-number format currently `VK-####` mock (`types/cart.ts:20`) — server can generate on persist or derive from row id; keep `VK-` prefix for UI continuity.

## Requirements
**Functional**
- `getMenu(): Promise<MenuCategory[]>` — categories→items→groups→choices, ordered by `sort`.
- `getFeaturedItems(): Promise<MenuItem[]>` — `is_featured` items.
- `getRestaurant(): Promise<RestaurantSettings>` — settings row mapped to restaurant shape.
- Order helpers: `createOrder(input)`, `listOrders(filter?)`, `getOrder(id)`, `updateOrderStatus(id, status)`.
- Menu/settings mutation helpers (stubs used by 06/07): each calls `requireAdmin()` then service-role write.
- `/menu` + home render from DB with `revalidate = 60`; graceful static fallback.
- `POST /api/orders` persists an order and returns its number.

**Non-functional**
- Only `lib/db/*` + `lib/supabase/*` import the SDK.
- Server recomputes money; client totals never trusted.
- Files < 200 lines; split mappers per concern.

## Architecture
- **Read path:** server component → `lib/db/get-menu.ts` → server/anon Supabase client (RLS public SELECT) → row→domain mapper → domain types → existing components unchanged.
- **Write path (orders):** `POST /api/orders` route → validate payload → `lib/pricing` recompute → `lib/db/create-order.ts` (anon INSERT allowed by RLS) → return number → client shows confirmation.
- **Write path (admin, stubs):** action → `requireAdmin()` → `lib/db` mutation → service-role client → `revalidatePath`.

## Related Code Files
**Create**
- `lib/db/mappers/menu-row-to-domain.ts` (row→`MenuCategory`/`MenuItem`)
- `lib/db/mappers/settings-row-to-restaurant.ts`
- `lib/db/mappers/cart-to-order-items.ts` (`CartLine[]`→`order_items` rows, frozen)
- `lib/db/get-menu.ts`, `lib/db/get-featured-items.ts`, `lib/db/get-restaurant.ts`
- `lib/db/create-order.ts`, `lib/db/list-orders.ts`, `lib/db/get-order.ts`, `lib/db/update-order-status.ts`
- `lib/db/mutate-menu.ts` (category/item/group/choice CRUD stubs, guarded — filled in 06)
- `lib/db/mutate-settings.ts` (guarded stub — filled in 07)
- `types/settings.ts` (`RestaurantSettings` domain type mirroring `data/restaurant.ts`)
- `app/api/orders/route.ts` (`POST`)

**Modify**
- `app/menu/page.tsx` → `async`, `export const revalidate = 60`, read `getMenu()`
- `components/home/popular-dishes.tsx` → consume `getFeaturedItems()` (make home/page async, pass down)
- `app/page.tsx` → `async` + `revalidate = 60`; pass featured + restaurant from `lib/db`
- `components/checkout/checkout-view.tsx` / `checkout-form.tsx` → on place-order, `POST /api/orders`, then set `lastOrder` from server response, navigate to `/order/confirmed`
- `lib/structured-data.ts` — source menu/restaurant from `lib/db` where used server-side (keep static fallback)

**Delete:** none (keep `data/menu/*` as seed/fallback)

## Implementation Steps
1. `types/settings.ts`: `RestaurantSettings` mirroring `RESTAURANT` (name, tagline, blurb, address, suburb, phone, hours[], postal, openingHours[]).
2. Mapper `menu-row-to-domain.ts`: given joined rows, build `MenuCategory[]` (slug→id, description→desc, image_url→image, nest groups/choices, sort ordering). Unit-tested in Phase 08.
3. `get-menu.ts`: single query with nested selects (`categories → menu_items → option_groups → option_choices`); order by `sort`; on error/no-env → `import { MENU } from '@/data/menu'` fallback. Only include `is_available` items on public read (admin sees all — Phase 06 uses a variant).
4. `get-featured-items.ts`: query `is_featured=true` (ordered), map, fallback to `featuredItems()`.
5. `get-restaurant.ts`: fetch settings row, map to `RestaurantSettings`; fallback to `RESTAURANT`.
6. `cart-to-order-items.ts`: map `CartLine[]` → order_items rows (item_name, unit_price=unit, quantity=qty, options=labels/notes snapshot as jsonb, line_total=unit*qty).
7. `create-order.ts`: accept validated input (service, customer fields, cart, recomputed subtotal/total); insert `orders` then `order_items` (transaction/rpc or sequential with cleanup); return `{ id, number }`.
8. `list-orders.ts` / `get-order.ts` / `update-order-status.ts`: staff-guarded reads/writes (call `requireStaff`/`requireStaff` respectively; status is in the allowed check set).
9. `app/api/orders/route.ts` POST: parse body (cart + service + customer), server-side recompute subtotal/total via `lib/pricing.ts`, reject on validation failure, call `create-order`, return `{ number, total }`. No auth (anon INSERT per RLS).
10. Convert `app/menu/page.tsx` to async server component reading `getMenu()`; add `revalidate = 60`.
11. Convert `app/page.tsx` + `popular-dishes.tsx` to read `getFeaturedItems()`/`getRestaurant()` server-side; `revalidate = 60`.
12. Rewire checkout place-order to POST `/api/orders`, use returned number for `lastOrder`, then navigate to confirmation.
13. `mutate-menu.ts` / `mutate-settings.ts`: define guarded function signatures (call `requireAdmin`, use service client, `revalidatePath('/menu')`/`('/')`) — bodies completed in 06/07.
14. `npm run build` + manual: menu/home render from DB; placing an order writes rows; confirmation shows persisted number.

## Todo List
- [ ] `types/settings.ts`
- [ ] Menu + settings + cart mappers
- [ ] `get-menu` / `get-featured-items` / `get-restaurant` with fallback
- [ ] `create-order` / `list-orders` / `get-order` / `update-order-status`
- [ ] `POST /api/orders` (server recompute totals)
- [ ] `/menu` async + revalidate
- [ ] home async + featured/restaurant from DB
- [ ] checkout → POST persist → confirmation
- [ ] mutate-menu / mutate-settings guarded stubs
- [ ] Build + manual read/persist verification

## Success Criteria
- `/menu` + home render identical content to pre-DB (mapper parity), sourced from Supabase.
- Placing a public order inserts `orders` + `order_items` rows; confirmation number matches persisted row.
- Server-recomputed totals match `lib/pricing.ts`; client-sent totals ignored.
- Env unset / DB error → public menu/home still render from static fallback.
- Only `lib/db`/`lib/supabase` import the SDK (grep verifies).

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Mapper drift vs domain types breaks public UI | Med | High | Phase 08 mapper unit tests vs `types/menu.ts`; keep props identical |
| Public menu now depends on DB uptime | Med | High | ISR cache + static fallback on fetch error (spec §14) |
| Client tampering with order totals | Med | High | Server recomputes via `lib/pricing`; never trust client sums |
| Service vocabulary mismatch (pickup/delivery vs dine-in/pickup) | High | Low | Persist existing `Service` values; flag to user (open Q) |
| N+1 / heavy nested query on every request | Low | Med | Single nested select + `revalidate=60` ISR |
| Order partial write (orders ok, items fail) | Low | Med | Wrap in rpc/transaction or delete order on items failure |

## Security Considerations
- `POST /api/orders` validates + recomputes server-side; anon INSERT only (cannot read others' orders — RLS).
- Read helpers use anon/server client under public-SELECT RLS; no service-role on public read path.
- Admin mutation stubs gate on `requireAdmin()` before any service-role write.

## Next Steps
- Phases 04–07 consume `lib/db` behind the guarded admin shell.
- Phase 08 unit-tests mappers + pricing parity + guards.
