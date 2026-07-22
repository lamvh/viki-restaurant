# Phase 01 — Supabase Foundation

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-22-viki-admin-design.md](../../docs/superpowers/specs/2026-07-22-viki-admin-design.md) (§4 architecture, §5 data model, §10 images, §15 setup)
- Depends on: none
- Unblocks: 02, 03

## Overview
- **Priority:** P1 (blocks all DB-backed work)
- **Status:** done
- **Description:** Stand up Supabase integration: install SDK, build the client layer (`lib/supabase/`), author SQL migrations for the full schema + RLS, seed script (menu + restaurant + first admin), generated types, `.env.example` docs. Public site continues working from static fallback until env is set.

## Key Insights
- The entire data model is fully specified in spec §5 — do NOT re-derive. Column names, types, checks, defaults are exact. Transcribe faithfully.
- `@supabase/ssr` is required for cookie-bound sessions in App Router (not the legacy `auth-helpers`).
- Service-role client must be unimportable from client bundles — add `import 'server-only'` at top of `service-client.ts`.
- Seed image decision (spec §10 / §16 open Q): v1 shortcut = store `image_url` pointing at existing `/dishes/*.jpg` public paths; migrate to Storage on first re-upload in Phase 06. Chosen here to unblock; documented in deployment guide.
- Existing domain shape (`types/menu.ts`): category has `id/name/items`; item has `id/name/desc/price/tags?/groups?/image?`. DB `slug` maps to current string `id` (e.g. `phobo`); DB `name`↔`name`, `description`↔`desc`, `image_url`↔`image`. Mapper lives in Phase 03.

## Requirements
**Functional**
- Migrations create all 8 tables (`profiles`, `categories`, `menu_items`, `option_groups`, `option_choices`, `orders`, `order_items`, `settings`) with exact columns/checks/defaults from spec §5.
- RLS enabled on every table with policies per spec §5 "RLS policies".
- Seed populates categories/items/option groups/choices from `data/menu/*`, settings from `data/restaurant.ts`, one admin profile.
- Three Supabase clients + middleware helper exist and typecheck.
- `supabase gen types typescript` output committed to `types/supabase.ts`.

**Non-functional**
- Service-role key never reaches client bundle (guarded).
- Each source file < 200 lines; kebab-case.
- App builds even when Supabase env vars are absent (lazy client init / guarded fallback).

## Architecture
- **Client layer (`lib/supabase/`):** `browser-client.ts` (`createBrowserClient`), `server-client.ts` (`createServerClient` bound to `next/headers` cookies), `service-client.ts` (`server-only` + service-role key), `middleware.ts` (session refresh helper — consumed by Phase 02).
- **Migrations (`supabase/migrations/`):** ordered SQL files; one concern per file for reviewability.
- **Data flow (this phase):** seed script → Supabase (write). No app runtime reads yet — Phase 03 wires `lib/db`.

## Related Code Files
**Create**
- `lib/supabase/browser-client.ts`
- `lib/supabase/server-client.ts`
- `lib/supabase/service-client.ts` (`import 'server-only'`)
- `lib/supabase/middleware.ts` (updateSession helper)
- `supabase/migrations/0001_core_menu_tables.sql` (categories, menu_items, option_groups, option_choices)
- `supabase/migrations/0002_orders_tables.sql` (orders, order_items)
- `supabase/migrations/0003_profiles_and_settings.sql` (profiles + trigger stub, settings single-row constraint)
- `supabase/migrations/0004_rls_policies.sql` (enable RLS + all policies)
- `supabase/seed.sql` or `scripts/seed.ts` (menu + restaurant + admin)
- `types/supabase.ts` (generated)
- `.env.example` additions (append Supabase vars)
- `supabase/config.toml` (if using CLI local dev)

**Modify**
- `package.json` (add `@supabase/supabase-js`, `@supabase/ssr`, `server-only`; dev `supabase`; scripts `db:seed`, `db:types`)
- `.gitignore` (ensure `.env.local`, `supabase/.branches`, `supabase/.temp` ignored)
- `docs/deployment-guide.md` (Supabase setup steps)

**Delete:** none

## Implementation Steps
1. `npm i @supabase/supabase-js @supabase/ssr server-only`; `npm i -D supabase`. Add scripts: `db:types` (`supabase gen types typescript --local > types/supabase.ts`), `db:seed`.
2. Append Supabase env vars to `.env.example` with comments (public URL/anon are `NEXT_PUBLIC_`, service-role is server-only — warn "never commit real value").
3. `lib/supabase/browser-client.ts`: export `createClient()` using `createBrowserClient(url, anonKey)`.
4. `lib/supabase/server-client.ts`: export async `createClient()` using `createServerClient` with `cookies()` get/set adapters from `next/headers`.
5. `lib/supabase/service-client.ts`: `import 'server-only'` first line; export `createServiceClient()` from `SUPABASE_SERVICE_ROLE_KEY`; throw clear error if key missing.
6. `lib/supabase/middleware.ts`: `updateSession(request)` refreshing cookies (used by Phase 02 middleware). Return `{ response, user }`.
7. Migration `0001`: `categories` (id uuid pk default gen_random_uuid, slug text unique not null, name text not null, sort int not null default 0). `menu_items`, `option_groups`, `option_choices` exactly per spec §5 with FKs + `on delete cascade`.
8. Migration `0002`: `orders` (service, customer_name, customer_phone, note, subtotal, total, status check default 'new', created_at) + `order_items` (frozen snapshot cols, options jsonb default '[]').
9. Migration `0003`: `profiles` (id uuid pk fk auth.users, name, role check in ('admin','staff') default 'staff', created_at) + `settings` single-row (fixed uuid PK + `check (id = '<constant>')` to enforce one row) mirroring `data/restaurant.ts` fields as jsonb where noted. Trigger `handle_new_user()` inserting a `profiles` row on `auth.users` insert (full wiring validated in Phase 02).
10. Migration `0004`: `alter table … enable row level security` on all; policies: public SELECT on menu/settings/profiles tables; `orders`/`order_items` INSERT for anon, SELECT/UPDATE none via anon (staff reads go through server client under authenticated session — document that authenticated SELECT policy is added here for `authenticated` role). No anon write policies on menu/settings.
11. Seed: insert categories/items/option_groups/option_choices transcribed from `data/menu/appetizers.ts`, `mains.ts`, `charcoal-signature.ts` (preserve slugs = current ids, sort order, tags, `is_featured` = ids in `FEATURED_IDS`, `image_url` = existing `/dishes/*` path). Insert `settings` from `data/restaurant.ts`. Document admin-user creation (dashboard sign-up then `update profiles set role='admin'`) in deployment guide.
12. Apply migrations (`supabase db push` or dashboard SQL), run seed, run `db:types` → `types/supabase.ts`.
13. `npm run build` — must pass with AND without env vars present (guarded init).

## Todo List
- [x] Install SDK + CLI deps, add scripts
- [x] `.env.example` Supabase vars documented
- [x] `browser-client.ts` / `server-client.ts` / `service-client.ts` (`server-only`) / `middleware.ts`
- [x] Migration 0001 core menu tables
- [x] Migration 0002 orders tables
- [x] Migration 0003 profiles + trigger + single-row settings
- [x] Migration 0004 RLS enable + policies
- [x] Seed script (menu + restaurant + admin docs)
- [x] Generate `types/supabase.ts`
- [x] Deployment guide Supabase setup section
- [x] Build passes with and without env

## Success Criteria
- All migrations apply cleanly; RLS on for every table; `\d` shows exact spec columns.
- Seed produces menu matching current `data/menu/*` (category/item/option counts equal).
- Anon SELECT on menu works; anon INSERT/UPDATE on menu blocked (verify via SQL).
- `types/supabase.ts` generated and imported without TS errors.
- Attempting to import `service-client.ts` from a client component fails the build (`server-only`).

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Supabase project not provisioned blocks dev | High | Med | Fallback path (static menu) keeps public site working; phase deliverables (migrations/clients/seed) authored independent of live project; apply once env supplied |
| RLS misconfig exposes writes | Med | High | Zero anon write policies on menu/settings; writes only via service-role behind Phase 02 role check; review policies in this phase, add SQL assertions |
| Single-row `settings` not enforced | Low | Med | Fixed-constant PK + check constraint; seed inserts exactly one row |
| Seed drifts from static menu | Med | Med | Seed transcribed directly from `data/menu/*`; Phase 08 mapper parity test catches divergence |
| `gen_random_uuid()` unavailable | Low | Low | Enabled by default in Supabase (pgcrypto); note in migration header |

## Security Considerations
- Service-role key: server-only import guard; never `NEXT_PUBLIC_`; `.env.local` git-ignored; documented as "do not commit" in `.env.example`.
- RLS enabled before any data is exposed; anon limited to menu SELECT + orders INSERT.
- Seed script must not hardcode real credentials; admin creation is a manual documented step.

## Next Steps
- Phase 02 wires the `profiles` trigger end-to-end, middleware guard, and login using these clients.
