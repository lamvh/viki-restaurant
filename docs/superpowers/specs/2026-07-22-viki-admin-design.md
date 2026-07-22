# Viki Admin — Full-Stack Admin Dashboard Design

- **Date:** 2026-07-22
- **Status:** Approved for planning
- **Related:** [2026-07-05 homepage & ordering flow spec](./2026-07-05-viki-nextjs-homepage-and-ordering-flow-design.md)

## 1. Summary

Viki is today a fully client-side marketing + ordering site (Next.js 15 App
Router, React 19, Tailwind v4). The menu lives in TypeScript files
(`data/menu/*.ts`) and orders exist only in the browser (Zustand + `localStorage`).
There is no backend, database, auth, or persistence.

This project adds a **real full-stack admin dashboard** at `/admin`, backed by
**Supabase** (Postgres + Auth + Storage). Restaurant staff log in, manage the
menu (which now drives the public site), view and progress orders, and edit
restaurant details. Two roles — **admin** and **staff** — gate what each user
can do.

The origin brief was a Claude Design mockup (`Viki Admin.dc.html`) that could not
be fetched (auth wall / MCP not connected in-session). The admin UI therefore
follows Viki's existing **"1b — Fresh"** design system (tokens in
`app/globals.css`, Instrument Serif + Hanken Grotesk) rather than a pixel copy of
that mockup. If the mockup is provided later, admin screens can be refined to match.

## 2. Goals

- Staff manage the menu through a UI; edits go **live on the public site**.
- Orders placed on the public site are **persisted** and visible to staff, with a
  status workflow.
- Restaurant details (hours, address, phone) are editable, not hardcoded.
- Real authentication with **admin** vs **staff** roles, enforced server-side.
- Stay within the Next.js 15 App Router + Vercel deployment model.

## 3. Non-Goals (YAGNI)

- No customer accounts / customer-facing auth. Auth is staff-only.
- No online payment capture. The existing client-side checkout flow is unchanged
  except that it now **persists** the order.
- No analytics beyond the dashboard's derived counts.
- No multi-restaurant / multi-tenant support.
- No pixel-perfect reproduction of the original mockup (not available).
- No email/password reset flows beyond what Supabase Auth provides out of the box.

## 4. Architecture

### 4.1 Stack additions

| Concern | Choice |
|---|---|
| Database | Supabase Postgres |
| Auth | Supabase Auth (email + password), cookie sessions via `@supabase/ssr` |
| File storage | Supabase Storage (`dish-images` bucket) |
| Schema/migrations | SQL migrations in `supabase/migrations/` |
| Types | Generated via `supabase gen types typescript` |
| Data access | Server-side Supabase clients (anon for reads under RLS, service-role for admin writes) |

### 4.2 Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…   # server-only; never exposed to the client
```

Added to `.env.local` (git-ignored) and documented in `.env.example` + the
deployment guide. Service-role key is used only in server code (route handlers /
server actions / server components that perform privileged writes).

### 4.3 Supabase client layer (`lib/supabase/`)

- `browser-client.ts` — `createBrowserClient` for client components (auth UI).
- `server-client.ts` — `createServerClient` bound to Next cookies for
  authenticated reads/session in server components and route handlers.
- `service-client.ts` — service-role client for privileged writes; guarded so it
  can only be imported server-side.
- `middleware.ts` helper — refreshes the session cookie and guards `/admin`.

### 4.4 Data-access layer (`lib/db/`)

Maps DB rows → the existing domain types in `types/menu.ts` so **public
components keep their current props**. Functions such as:

- `getMenu(): Promise<MenuCategory[]>` — categories with nested items, option
  groups, and choices, ordered by `sort` fields.
- `getFeaturedItems()` — items flagged featured (replaces `FEATURED_IDS`).
- `getRestaurant(): Promise<RestaurantSettings>` — settings row.
- Order helpers: `createOrder`, `listOrders`, `updateOrderStatus`.
- Menu mutation helpers (admin): create/update/delete category, item, option
  group, choice; each checks role server-side.

This is the single boundary between Supabase and the rest of the app. Nothing
outside `lib/db/` and `lib/supabase/` imports the Supabase SDK.

## 5. Data Model

Postgres tables (snake_case columns). `id` = `uuid default gen_random_uuid()`
unless noted.

### `profiles`
Extends `auth.users` (1:1). Created by a trigger on new auth user.
- `id uuid` PK, FK → `auth.users.id`
- `name text`
- `role text not null check (role in ('admin','staff')) default 'staff'`
- `created_at timestamptz default now()`

### `categories`
- `id`, `slug text unique not null` (e.g. `mains`)
- `name text not null`
- `sort int not null default 0`

### `menu_items`
- `id`, `category_id` FK → categories (on delete cascade)
- `slug text unique not null` (maps to current item `id`, e.g. `phobo`)
- `name text not null`, `description text not null default ''`
- `price numeric(10,2) not null`
- `tags text[] not null default '{}'` (values: `GF|DF|VEG|R18`)
- `image_url text` (nullable → ImageSlot placeholder)
- `is_featured boolean not null default false`
- `is_available boolean not null default true`
- `sort int not null default 0`

### `option_groups`
- `id`, `menu_item_id` FK (cascade)
- `title text not null`
- `type text not null check (type in ('single','multi'))`
- `sort int not null default 0`

### `option_choices`
- `id`, `option_group_id` FK (cascade)
- `label text not null`
- `price numeric(10,2) not null default 0`
- `sort int not null default 0`

### `orders`
- `id`
- `service text not null` (dine-in / pickup — matches existing service toggle)
- `customer_name text`, `customer_phone text`, `note text`
- `subtotal numeric(10,2) not null`, `total numeric(10,2) not null`
- `status text not null check (status in ('new','preparing','ready','completed','cancelled')) default 'new'`
- `created_at timestamptz default now()`

### `order_items`
Snapshot of the line at order time (prices frozen).
- `id`, `order_id` FK (cascade)
- `item_name text not null`, `unit_price numeric(10,2) not null`
- `quantity int not null`
- `options jsonb not null default '[]'` (selected choices snapshot)
- `line_total numeric(10,2) not null`

### `settings`
Single row (`id` fixed constant, enforce one row).
- Restaurant fields mirroring `data/restaurant.ts`: `name`, `tagline`, `blurb`,
  `address`, `suburb`, `phone`, `hours jsonb`, `postal jsonb`, `opening_hours jsonb`.

### RLS policies
- `profiles`, `categories`, `menu_items`, `option_groups`, `option_choices`,
  `settings`: **public SELECT** (menu is public). Writes: none via anon —
  performed only through the **service-role** client after a server-side role
  check.
- `orders`, `order_items`: INSERT allowed for anon (public checkout persists the
  order); SELECT/UPDATE only via authenticated staff (checked server-side).
- Admin-only mutations (menu, settings, user roles) go through server code that
  verifies `profiles.role = 'admin'` before using the service-role client.

## 6. Roles & Permissions

| Area | admin | staff |
|---|---|---|
| Dashboard | ✅ | ✅ |
| Orders — view | ✅ | ✅ |
| Orders — change status | ✅ | ✅ |
| Menu — view | ✅ | ✅ (read-only) |
| Menu — create/edit/delete + image upload | ✅ | 🚫 |
| Settings — edit | ✅ | 🚫 |
| Users — invite / set role | ✅ | 🚫 |

Enforcement is **two-layer**: (1) server-side guard in every mutating
action/route (source of truth); (2) UI hides/disables controls the role can't
use. Never rely on the UI alone.

## 7. Auth Flow

- `/admin/login` — email + password form (client component using browser client).
- On submit → Supabase Auth; on success redirect to `/admin`.
- `middleware.ts` matches `/admin/:path*` (except `/admin/login`), refreshes the
  session, and redirects unauthenticated users to `/admin/login`.
- Server components/actions read the session via the server client and load the
  caller's `profiles.role` for authorization.
- First admin: created via a seed step / Supabase dashboard, then `role` set to
  `admin`. Documented in the deployment guide.

## 8. Public Site Rewiring

Currently `app/menu/page.tsx` and `components/home/popular-dishes.tsx` import the
static `MENU` / `featuredItems()`. These become **async server components** that
call `lib/db` (`getMenu`, `getFeaturedItems`, `getRestaurant`) with
`export const revalidate = 60` (ISR) so edits appear promptly without per-request
DB load. Admin mutations call `revalidatePath('/menu')` / `revalidatePath('/')`
for immediacy.

The public checkout confirmation (`app/order/confirmed` flow) POSTs the cart to
`POST /api/orders` (or a server action) to persist the order before showing the
confirmation. Domain types (`MenuItem`, `MenuCategory`, cart types) are unchanged;
only the data source moves from static import → DB.

`data/menu/*.ts` and `data/restaurant.ts` are retained as the **seed source** and
as a fallback reference; they are no longer the runtime source for the menu.

## 9. Admin UI Surface (`app/admin/`)

Route group with its own layout (sidebar + top bar), styled with existing Viki
tokens, isolated from the public `SiteHeader`/`SiteFooter`.

- `/admin` — **Dashboard**: metric cards (today's orders, revenue, avg order,
  most-ordered dish) derived from `orders`; recent-orders list.
- `/admin/orders` — table with status filter; row → detail; status transitions.
- `/admin/menu` — categories + items list; create/edit item form (name, desc,
  price, tags, availability, featured, image upload, option groups editor).
  Read-only for staff.
- `/admin/settings` — restaurant details form (admin only).
- `/admin/users` — list profiles, set role, invite (admin only).
- `/admin/login` — auth screen (outside the guarded layout).

Components live under `components/admin/` (each file focused, < 200 lines per
repo convention). Server actions under `app/admin/**/actions.ts` or route
handlers under `app/api/`.

## 10. Image Uploads

- Bucket `dish-images` (public read). Admin item form uploads a file via a
  server action → `service-role` storage upload → public URL stored in
  `menu_items.image_url`.
- Validation: type (jpeg/png/webp), max size (~5 MB). Deleting/replacing an image
  removes the old object best-effort.
- Existing `/public/dishes/*.jpg` are seeded by uploading them to the bucket (or,
  as a v1 shortcut, seeded as `image_url` pointing at the existing `/dishes/...`
  public paths, migrated to Storage when first re-uploaded). Seed approach chosen
  during Phase 1.

## 11. Phasing

1. **Supabase foundation** — project config, client layer, schema migrations,
   RLS, seed script (menu + restaurant + first admin), generated types.
2. **Auth + roles** — login page, middleware guard, session + role helpers,
   `profiles` trigger.
3. **Data-access layer + public rewiring** — `lib/db`, convert menu/home to
   async server components, persist orders from checkout.
4. **Admin shell + Dashboard**.
5. **Orders admin** — list, detail, status workflow.
6. **Menu admin** — CRUD + option-group editor + Storage image uploads.
7. **Settings + Users admin**.
8. **Tests + docs** — unit tests for `lib/db` mappers, pricing parity, role
   guards; component tests for key admin forms; update `docs/`.

Each phase is independently reviewable and leaves the app in a working state
(public site keeps functioning throughout; DB-backed reads fall back gracefully
if env is unset during early phases).

## 12. Testing Strategy

- **Unit:** `lib/db` row→domain mappers; order total/subtotal parity with
  existing `lib/pricing.ts`; role-guard helper (admin vs staff vs anon).
- **Component (RTL):** login form validation; menu item form; order status
  control; role-based hide/disable.
- **Integration (where feasible):** order persistence round-trip against a local
  Supabase (or mocked client) — mocks only at the SDK boundary, no fake business
  logic.
- Follows repo rule: no fake data / cheats to pass; failing tests are fixed, not
  skipped.

## 13. Security Considerations

- Service-role key server-only; never imported into client bundles (guarded).
- Every mutation authorizes against `profiles.role` server-side before writing.
- RLS on all tables as the second line of defence.
- Anon can only INSERT orders, never read others' orders or mutate the menu.
- Input validation on all admin forms and the public order POST.
- Standard Supabase Auth session handling; `/admin` fully guarded by middleware.

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Supabase project not yet provisioned blocks dev | Phases 1–2 include setup docs; app degrades gracefully (public site works from seed/fallback) until env is set |
| Public menu now depends on DB availability | ISR caching + `revalidate`; consider a static fallback to `data/menu` if a fetch fails |
| RLS misconfig exposing writes | Writes never go through anon; service-role behind server role checks; RLS reviewed in Phase 1 |
| Order schema drift vs client cart types | `order_items` stores a frozen snapshot; mappers unit-tested against `types/cart.ts` |
| Scope creep (roles, users mgmt) | Roles limited to admin/staff, no granular permissions; users page minimal |

## 15. Setup Prerequisites (user-provided)

Before DB-backed phases run, the user must:
1. Create a Supabase project.
2. Provide `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`.
3. Create the `dish-images` Storage bucket (or let the setup script create it).
4. Create the first admin user (seed step or Supabase dashboard), role = `admin`.

These are documented in the deployment guide and `.env.example`.

## 16. Open Questions

- Original `Viki Admin.dc.html` mockup unavailable — admin visuals follow Viki's
  existing design system. Provide the mockup to refine screen layouts to match.
- Seed images: upload existing `/public/dishes` into Storage vs. reference
  existing public paths for v1 — decided in Phase 1.
