---
title: "Viki Admin — Full-Stack Admin Dashboard"
description: "Supabase-backed /admin dashboard: auth, roles, menu/orders/settings/users CRUD; public site now DB-driven"
status: in_progress
priority: P2
effort: 40h
branch: main
tags: [nextjs, supabase, postgres, auth, admin, rls, storage]
created: 2026-07-22
---

# Viki Admin — Full-Stack Admin Dashboard

Adds a real full-stack admin at `/admin`, backed by **Supabase** (Postgres + Auth +
Storage). Staff log in, manage the menu (now driving the public site), view/progress
orders, and edit restaurant details. Two roles — **admin** and **staff** — gate access.
Public marketing + ordering site keeps working throughout; menu reads move from static
`data/menu/*` → DB via a single `lib/db` boundary.

**Source of truth:** [`docs/superpowers/specs/2026-07-22-viki-admin-design.md`](../../docs/superpowers/specs/2026-07-22-viki-admin-design.md)

## Phases

| # | Phase | Effort | Status | Depends on |
|---|---|---|---|---|
| 01 | [Supabase foundation](./phase-01-supabase-foundation.md) | 6h | ✅ done | — |
| 02 | [Auth + roles](./phase-02-auth-and-roles.md) | 5h | ✅ done | 01 |
| 03 | [Data-access layer + public rewiring](./phase-03-data-access-layer-and-public-rewiring.md) | 6h | ⬜ pending | 01, 02 |
| 04 | [Admin shell + Dashboard](./phase-04-admin-shell-and-dashboard.md) | 4h | ⬜ pending | 02, 03 |
| 05 | [Orders admin](./phase-05-orders-admin.md) | 4h | ⬜ pending | 03, 04 |
| 06 | [Menu admin + image uploads](./phase-06-menu-admin-and-image-uploads.md) | 6h | ⬜ pending | 03, 04 |
| 07 | [Settings + Users admin](./phase-07-settings-and-users-admin.md) | 4h | ⬜ pending | 04, 06 |
| 08 | [Tests + docs](./phase-08-tests-and-docs.md) | 5h | ⬜ pending | 03–07 |

**Total effort:** 40h

## Dependency graph

```
01 (DB + clients + seed) ──► 02 (auth/roles) ──► 03 (lib/db + public rewiring)
                                                     │
                     ┌───────────────────────────────┤
                     ▼                                ▼
              04 (admin shell + dashboard)     05 (orders admin)
                     │
                     ├──► 06 (menu admin + uploads) ──► 07 (settings + users)
                     │
                     └──────────────► 08 (tests + docs, validates 03–07)
```

01 stands up Postgres schema, RLS, Supabase clients, seed. 02 adds session/role helpers
+ middleware guard. 03 is the single Supabase↔app boundary and rewires public reads +
order persistence. 04 gives the guarded admin layout every admin page mounts in. 05/06/07
are the CRUD surfaces (05 read-heavy, 06 the largest — Storage uploads + option editor).
08 locks mappers, pricing parity, and role guards with tests + updates `docs/`.

## Key cross-cutting decisions

- **Single data boundary:** only `lib/db/*` and `lib/supabase/*` import the Supabase SDK. Everything else keeps consuming domain types (`types/menu.ts`, `types/cart.ts`) unchanged.
- **Two-layer authz:** every mutation authorizes `profiles.role` server-side (source of truth) via the service-role client; UI hide/disable is cosmetic only. RLS is the second line of defence.
- **Service-role key is server-only:** `lib/supabase/service-client.ts` guarded against client import; never in a client bundle.
- **Public reads via ISR:** `/menu` + `/` become async server components (`revalidate = 60`); admin mutations `revalidatePath('/menu')` / `revalidatePath('/')` for immediacy.
- **Graceful degradation:** if Supabase env unset (early phases / outage), public menu falls back to static `data/menu/*` so the site never hard-fails.
- **Frozen order snapshot:** `order_items` stores name/price/options at order time; decouples orders from later menu edits.
- **Design system:** admin UI reuses existing Viki "1b — Fresh" tokens (`app/globals.css`), not a copy of the unavailable mockup.

## Key dependencies (external / user-provided)

- Supabase project provisioned; `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (git-ignored).
- npm deps: `@supabase/supabase-js`, `@supabase/ssr`; dev: `supabase` CLI (types gen + local dev, optional).
- `dish-images` Storage bucket (public read) created by setup script or dashboard.
- First admin user created (seed/dashboard), `profiles.role = 'admin'`.

## Out of scope (YAGNI)

Customer accounts/auth, online payments, analytics beyond dashboard counts, multi-tenant,
pixel-perfect mockup match, custom password-reset flows (Supabase defaults only), granular
per-permission roles.

## Success criteria (milestone done)

1. `dev`/`build`/`lint`/`test` all green; service-role key never in client bundle.
2. Staff log in at `/admin/login`; `/admin/*` guarded by middleware; unauth → login.
3. Menu edits in `/admin/menu` appear on public `/menu` + `/` (ISR + revalidate).
4. Public checkout persists an order; it appears in `/admin/orders` with working status workflow.
5. Role matrix enforced server-side (admin vs staff vs anon) — verified by tests.
6. `docs/` updated (architecture, deployment, changelog, `.env.example`).
