# Phase 02 — Auth + Roles

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-22-viki-admin-design.md](../../docs/superpowers/specs/2026-07-22-viki-admin-design.md) (§6 roles, §7 auth flow, §13 security)
- Depends on: 01 (clients + profiles table + trigger)
- Unblocks: 03, 04

## Overview
- **Priority:** P1
- **Status:** done
- **Description:** Real staff auth via Supabase Auth (email + password), cookie sessions, middleware guarding `/admin/*`, and a reusable server-side role-authorization helper (`admin`/`staff`/`anon`). This is the security backbone every admin mutation depends on.

## Key Insights
- Two-layer authz (spec §6): server guard is the source of truth; UI hide/disable comes later (Phases 04–07). This phase delivers the server guard.
- Root `middleware.ts` (Next.js) must call `lib/supabase/middleware.ts:updateSession` to keep the cookie fresh, THEN redirect unauthenticated `/admin/*` (except `/admin/login`) to login. Order matters: refresh before guard.
- Role lookup: after session, load `profiles.role` for `auth.uid()`. Helper returns a typed result so callers `requireAdmin()` / `requireStaff()` uniformly.
- First-admin bootstrap is a documented manual step (spec §7) — no self-serve signup UI (staff-only, invite-driven in Phase 07).
- The `profiles` insert trigger from Phase 01 must be verified live here: creating an auth user must yield a `profiles` row with default `role='staff'`.

## Requirements
**Functional**
- `/admin/login` renders an email+password form (client component, browser client).
- Successful login sets session cookie, redirects to `/admin`.
- `middleware.ts` refreshes session and redirects unauthenticated `/admin/*` → `/admin/login`; leaves `/admin/login` public.
- Server helper resolves current user + role; `requireAdmin()` / `requireStaff()` throw/redirect on failure.
- Sign-out action clears session.

**Non-functional**
- No role check trusts client input; role read from DB server-side.
- Files < 200 lines; kebab-case.

## Architecture
- **Auth data flow:** login form → browser client `signInWithPassword` → Supabase sets cookies → redirect. Subsequent requests → `middleware.ts` refreshes → server components/actions read session via server client → load `profiles.role`.
- **Guard boundary:** `lib/auth/require-role.ts` is the one place role decisions are made; all mutating actions (Phases 05–07) call it.

## Related Code Files
**Create**
- `middleware.ts` (root; `matcher: ['/admin/:path*']`)
- `app/admin/login/page.tsx` (server wrapper)
- `components/admin/auth/login-form.tsx` (`'use client'`)
- `lib/auth/get-session-user.ts` (session + profile fetch via server client)
- `lib/auth/require-role.ts` (`requireAuth`, `requireStaff`, `requireAdmin`, `Role` type)
- `app/admin/actions/sign-out.ts` (server action) — or colocated
- `components/admin/auth/sign-out-button.tsx` (`'use client'`)

**Modify**
- `supabase/migrations/0003_*.sql` — confirm/adjust trigger if live test reveals issues (or add `0005_fix_profiles_trigger.sql`)
- `docs/deployment-guide.md` (first-admin bootstrap steps)

**Delete:** none

## Implementation Steps
1. Root `middleware.ts`: import `updateSession`; call it; if path starts `/admin` and not `/admin/login` and no user → `NextResponse.redirect('/admin/login')`. Export `config.matcher = ['/admin/:path*']`.
2. `lib/auth/get-session-user.ts`: `getSessionUser()` → `{ user, role } | null` using server client `auth.getUser()` then select `role` from `profiles`.
3. `lib/auth/require-role.ts`: `requireAuth()` (redirect to login if null), `requireStaff()` (auth ok = admin|staff), `requireAdmin()` (role must be admin, else throw/403). Export `Role = 'admin' | 'staff'`.
4. `components/admin/auth/login-form.tsx`: controlled email+password, calls browser client `signInWithPassword`, surfaces error, `router.push('/admin')` on success. Client-side validation (required, email format).
5. `app/admin/login/page.tsx`: server page rendering `LoginForm`; if already authenticated, redirect `/admin`. `noindex`.
6. Sign-out: server action calling server client `auth.signOut()`, redirect `/admin/login`; `SignOutButton` invokes it.
7. Live-verify Phase 01 trigger: create a test auth user (dashboard), confirm `profiles` row auto-created with `role='staff'`; promote to admin via SQL; document.
8. Manual test: unauth visit `/admin` → login; login → `/admin` (404 until Phase 04 shell — acceptable; verify redirect + session cookie set).

## Todo List
- [x] Root `middleware.ts` (refresh + guard, matcher)
- [x] `get-session-user.ts`
- [x] `require-role.ts` (auth/staff/admin)
- [x] `login-form.tsx` client component
- [x] `app/admin/login/page.tsx` (redirect-if-authed, noindex)
- [x] Sign-out action + button
- [x] Verify profiles trigger live; promote first admin
- [x] Deployment guide: first-admin bootstrap
- [x] Manual guard/login/logout test

## Success Criteria
- Unauthenticated `/admin/*` redirects to `/admin/login`; `/admin/login` reachable while logged out.
- Valid credentials log in and land on `/admin`; invalid show an error, no session.
- `requireAdmin()` blocks a `staff` user; `requireStaff()` blocks anon.
- New auth user gets a `profiles` row (`staff` default); first admin promoted per docs.
- Sign-out clears session; subsequent `/admin` visit redirects to login.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Middleware guards login page → redirect loop | Med | High | Explicit exclusion of `/admin/login`; test logged-out access first |
| Session not refreshed → random logouts | Med | Med | `updateSession` called on every matched request before guard; follow `@supabase/ssr` cookie adapter pattern exactly |
| Trigger missing → login works but no profile/role | Med | High | Live-verify trigger in step 7; add fallback fix migration; `getSessionUser` treats missing profile as no-role (deny) |
| Role read client-side / spoofable | Low | High | Role always read from DB via server client; never from client-passed value |

## Security Considerations
- Guard is server-side (middleware + `require-role`); UI never the sole gate.
- Passwords handled entirely by Supabase Auth (no custom hashing/storage).
- `/admin/login` is `noindex`; no user enumeration in error messages (generic "invalid credentials").
- Missing/absent `profiles` role → treated as unauthorized (fail closed).

## Next Steps
- Phase 03 builds `lib/db` (reads/writes) that admin mutations call after passing `require-role`.
- Phase 04 mounts the guarded admin layout that assumes a valid session from this phase.
