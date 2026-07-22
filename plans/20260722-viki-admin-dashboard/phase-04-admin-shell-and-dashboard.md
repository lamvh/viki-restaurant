# Phase 04 — Admin Shell + Dashboard

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-22-viki-admin-design.md](../../docs/superpowers/specs/2026-07-22-viki-admin-design.md) (§9 admin UI, §6 roles)
- Depends on: 02 (session/role guard), 03 (`lib/db` order reads)
- Unblocks: 05, 06, 07

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** The `/admin` route group: guarded layout (sidebar + top bar) styled with existing Viki tokens, isolated from public `SiteHeader`/`SiteFooter`, plus the Dashboard page (metric cards + recent orders). Every later admin page mounts inside this shell.

## Key Insights
- `/admin` is a **route group with its own `layout.tsx`** — must NOT inherit public chrome. Public overlays (cart drawer, item modal) mounted in root `app/layout.tsx` should not render under `/admin`; verify they're gated (they read Zustand flags, so harmless, but keep admin clean).
- Layout is a server component: calls `getSessionUser()` (Phase 02), passes `role` to the sidebar so nav hides admin-only links for staff (cosmetic; server guard still enforces).
- Dashboard metrics derived from `orders` (spec §9): today's orders, revenue (sum today total), avg order, most-ordered dish (from `order_items`), recent-orders list. Add a `lib/db/get-dashboard-metrics.ts` (staff-guarded).
- Reuse `components/ui/money.tsx` for currency; reuse tokens (`bg-brand`, `text-ink`, etc.) — no new design system.

## Requirements
**Functional**
- `app/admin/layout.tsx` guards (redirect to login if no session) and renders sidebar + top bar + `{children}`.
- Sidebar links: Dashboard, Orders, Menu, Settings (admin), Users (admin); admin-only links hidden for staff.
- Top bar shows current user name/role + sign-out button.
- `/admin` Dashboard: metric cards + recent orders list, all from `lib/db`.

**Non-functional**
- Server components for data; client only for interactive bits (sign-out, active-link highlight).
- Files < 200 lines; kebab-case; tokens only.

## Architecture
- **Layout data flow:** request → middleware (Phase 02) → `admin/layout.tsx` `getSessionUser()` → render shell with role-filtered nav.
- **Dashboard data flow:** `admin/page.tsx` (server) → `getDashboardMetrics()` + `listOrders({limit})` → cards + list.

## Related Code Files
**Create**
- `app/admin/layout.tsx` (guarded shell)
- `app/admin/page.tsx` (Dashboard)
- `components/admin/layout/admin-sidebar.tsx` (nav; role-filtered)
- `components/admin/layout/admin-topbar.tsx` (user + sign-out)
- `components/admin/layout/admin-nav-link.tsx` (`'use client'` active-state)
- `components/admin/dashboard/metric-card.tsx`
- `components/admin/dashboard/recent-orders-list.tsx`
- `lib/db/get-dashboard-metrics.ts` (staff-guarded aggregate)

**Modify**
- `docs/system-architecture.md` (add `/admin` route group + component map)

**Delete:** none

## Implementation Steps
1. `app/admin/layout.tsx` (server): `const session = await getSessionUser(); if (!session) redirect('/admin/login')`. Render flex shell: `<AdminSidebar role>` + `<div><AdminTopbar user/> <main>{children}</main></div>`. Note: `/admin/login` is NOT under this layout (it's a sibling that renders its own minimal page) — confirm route structure so login isn't double-guarded.
2. `admin-sidebar.tsx`: nav items array with `adminOnly` flag; filter by `role`. Links to `/admin`, `/admin/orders`, `/admin/menu`, `/admin/settings`, `/admin/users`.
3. `admin-nav-link.tsx` (client): `usePathname` active highlight.
4. `admin-topbar.tsx`: show `user.name`/`role`; render `<SignOutButton>` (Phase 02).
5. `get-dashboard-metrics.ts`: `requireStaff()`; compute today's order count, revenue sum, avg order, most-ordered dish (group `order_items.item_name`), return typed metrics.
6. `metric-card.tsx`: label + value (+ optional sub); `recent-orders-list.tsx`: last N orders (number, service, total, status badge, time).
7. `admin/page.tsx` (server): fetch metrics + recent orders; render 4 cards + list. Empty-state when no orders.
8. Verify staff role: admin-only nav links hidden; visiting `/admin/settings` as staff still blocked server-side (Phase 07 enforces; here nav just hides).
9. `npm run build`; manual: login → dashboard renders; staff sees filtered nav.

## Todo List
- [ ] `app/admin/layout.tsx` guarded shell
- [ ] `admin-sidebar` (role-filtered) + `admin-nav-link` + `admin-topbar`
- [ ] `get-dashboard-metrics` (staff-guarded)
- [ ] `metric-card` + `recent-orders-list`
- [ ] `app/admin/page.tsx` dashboard
- [ ] Confirm login page outside guarded layout (no loop)
- [ ] Staff nav-filter manual check
- [ ] Update system-architecture docs
- [ ] Build passes

## Success Criteria
- Authenticated user sees admin shell (sidebar + topbar), no public chrome.
- Dashboard shows real metrics + recent orders from `lib/db`; empty-state when none.
- Staff role: Settings/Users nav links hidden; admin sees all.
- Sign-out from topbar returns to login.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Login page double-guarded → redirect loop | Med | High | Keep `/admin/login` outside `admin/layout.tsx` guard; verify route tree |
| Public overlays/chrome leak into admin | Low | Low | Own layout; confirm root overlays are store-flag gated (inert on admin) |
| Dashboard aggregate slow at scale | Low | Low | Small dataset; index `orders.created_at`; can memoize later (YAGNI now) |
| Metrics query bypasses role guard | Low | Med | `get-dashboard-metrics` calls `requireStaff()` |

## Security Considerations
- Layout re-checks session server-side (defence in depth beyond middleware).
- Nav filtering is cosmetic; real gate is server guards in each page/action.
- No secrets in client components; metrics fetched server-side.

## Next Steps
- Phase 05 fills `/admin/orders`; Phase 06 `/admin/menu`; Phase 07 settings + users — all inside this shell.
