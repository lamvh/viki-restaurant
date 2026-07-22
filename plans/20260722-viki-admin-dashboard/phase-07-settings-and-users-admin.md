# Phase 07 — Settings + Users Admin

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-22-viki-admin-design.md](../../docs/superpowers/specs/2026-07-22-viki-admin-design.md) (§9 settings/users, §6 roles, §5 settings/profiles)
- Depends on: 04 (admin shell), 06 (guarded-action + service-role pattern)
- Unblocks: —

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** `/admin/settings` (restaurant details form) + `/admin/users` (list profiles, set role, invite). Both admin-only. Settings edits flow to the public site (footer/location/JSON-LD) via `getRestaurant()` + revalidate.

## Key Insights
- Both pages admin-only (spec §6): `requireAdmin()` in page + every action. Staff must not reach them (nav already hides; server enforces).
- Settings is the single `settings` row (Phase 01). Form mirrors `data/restaurant.ts` fields (name, tagline, blurb, address, suburb, phone, hours jsonb, postal jsonb, opening_hours jsonb). Fills `mutate-settings.ts` stub from Phase 03.
- Settings save must `revalidatePath('/')` + `('/menu')` (footer/JSON-LD/location read restaurant) so public updates promptly.
- Users: list `profiles` (name, role, created_at). Set-role toggles admin↔staff. Invite uses Supabase Auth admin API via service-role (`inviteUserByEmail`) — the new user gets a `profiles` row via the Phase 01 trigger (default staff), then optionally promoted.
- **Self-lockout guard:** an admin must not demote the last remaining admin (or themselves if sole admin). Enforce server-side before role change.
- Invite/admin API requires service-role; server-only, `requireAdmin()` first.

## Requirements
**Functional**
- `/admin/settings`: edit restaurant details; save persists to `settings`; public site reflects changes.
- `/admin/users`: list profiles; change a user's role; invite a new user by email.
- Last-admin demotion prevented.
- All admin-only.

**Non-functional**
- `requireAdmin()` on pages + actions.
- Service-role admin API server-only.
- Files < 200 lines; validation on inputs.

## Architecture
- **Settings flow:** `admin/settings/page.tsx` (server, `requireAdmin`) → `getRestaurant()` → form → save action → `requireAdmin` → `mutate-settings` (service client) → `revalidatePath('/')`+`('/menu')`.
- **Users flow:** `admin/users/page.tsx` (server, `requireAdmin`) → `listProfiles()` → list + role controls + invite form → actions → `requireAdmin` → service-role (`profiles` update / `auth.admin.inviteUserByEmail`).

## Related Code Files
**Create**
- `app/admin/settings/page.tsx`
- `app/admin/settings/actions.ts` (`updateSettingsAction`, `requireAdmin`)
- `components/admin/settings/settings-form.tsx` (`'use client'`)
- `app/admin/users/page.tsx`
- `app/admin/users/actions.ts` (`setRoleAction`, `inviteUserAction`, `requireAdmin`)
- `components/admin/users/users-table.tsx`
- `components/admin/users/role-control.tsx` (`'use client'`)
- `components/admin/users/invite-user-form.tsx` (`'use client'`)
- `lib/db/list-profiles.ts` (admin-guarded)
- `lib/db/set-user-role.ts` (admin-guarded, last-admin check)
- `lib/db/invite-user.ts` (admin-guarded, service-role auth admin API)
- `lib/validation/settings-schema.ts`

**Modify**
- `lib/db/mutate-settings.ts` (fill body)
- `lib/structured-data.ts` / footer / location — confirm they read `getRestaurant()` (from Phase 03) so settings edits propagate

**Delete:** none

## Implementation Steps
1. `settings-schema.ts`: validate required fields, phone format lenient, hours/postal/opening_hours shape.
2. Fill `mutate-settings.ts`: `requireAdmin()`, validate, update the single settings row via service client, `revalidatePath('/')` + `('/menu')`.
3. `settings-form.tsx`: controlled fields for all restaurant details (incl. structured hours/postal/opening_hours editors); submit → `updateSettingsAction`.
4. `admin/settings/page.tsx`: `requireAdmin()`; `getRestaurant()`; render form.
5. `list-profiles.ts`: `requireAdmin()`; select profiles ordered by created_at.
6. `set-user-role.ts`: `requireAdmin()`; validate role ∈ {admin,staff}; if demoting an admin, count admins — block if it would leave zero; update via service client.
7. `invite-user.ts`: `requireAdmin()`; `service-client.auth.admin.inviteUserByEmail(email)`; rely on trigger for `profiles` row; optional immediate role set.
8. `users-table.tsx` + `role-control.tsx` (client, calls `setRoleAction`) + `invite-user-form.tsx` (client, calls `inviteUserAction`).
9. `admin/users/page.tsx`: `requireAdmin()`; list + controls + invite form; surface last-admin-block error.
10. Manual: edit settings → public footer/location/JSON-LD update; change a user role; invite a user (email received); attempt last-admin demotion → blocked; staff/anon cannot reach either page.

## Todo List
- [ ] `settings-schema` validation
- [ ] Fill `mutate-settings` (admin + revalidate)
- [ ] `settings-form` + `admin/settings/page.tsx`
- [ ] `list-profiles` (admin-guarded)
- [ ] `set-user-role` (last-admin guard)
- [ ] `invite-user` (service-role auth admin API)
- [ ] `users-table` + `role-control` + `invite-user-form`
- [ ] `admin/users/page.tsx`
- [ ] Confirm public reads use `getRestaurant()`
- [ ] Manual: settings propagate, role change, invite, last-admin block, staff/anon denied

## Success Criteria
- Admin edits restaurant details; public footer/location/JSON-LD reflect changes after save.
- Admin lists users, changes roles, invites by email (invite email sent).
- Demoting the last admin is blocked with a clear error.
- Staff/anon cannot access settings or users (server-enforced), not just hidden.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Last admin demotes self → lockout | Med | High | Server-side admin-count check in `set-user-role`; block if would reach zero |
| Invite API exposed / abused | Low | High | `requireAdmin()` before service-role admin API; server-only |
| Settings jsonb malformed breaks public JSON-LD | Med | Med | `settings-schema` validation; public read tolerant + static fallback |
| Multiple settings rows created | Low | Med | Single-row constraint (Phase 01); update-only, never insert |
| Public site doesn't reflect settings edit | Med | Med | `revalidatePath('/')`+`('/menu')`; confirm reads go through `getRestaurant()` |

## Security Considerations
- All settings/users pages + actions `requireAdmin()`.
- Supabase Auth admin API (invite) service-role, server-only.
- Role change validated + last-admin protected (availability/integrity control).
- Input validation on settings fields.

## Next Steps
- Phase 08 adds tests (guards, mappers, forms) + docs; validates the full admin surface.
