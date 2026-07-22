# Phase 08 — Tests + Docs

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-22-viki-admin-design.md](../../docs/superpowers/specs/2026-07-22-viki-admin-design.md) (§12 testing, §13 security)
- Depends on: 03–07 (all code under test)
- Unblocks: — (final phase, milestone gate)

## Overview
- **Priority:** P1 (quality gate — do not skip/fake tests)
- **Status:** pending
- **Description:** Unit tests for `lib/db` mappers, order pricing parity, and role guards; component (RTL) tests for key admin forms/controls; where feasible an order-persistence round-trip (mock only at the SDK boundary). Update `docs/`. Existing 46-test suite must stay green.

## Key Insights
- Repo rule: no fake data/cheats to pass; failing tests are fixed, not skipped. Mocks only at the Supabase SDK boundary — never fake business logic.
- Existing harness: Vitest + RTL + jsdom, `@` alias (`vitest.config.ts`). Follow established patterns (see `lib/pricing.test.ts`, `components/**/**.test.tsx`).
- Highest-value tests (spec §12): (1) row→domain mapper equivalence with `types/menu.ts`; (2) order total/subtotal parity vs `lib/pricing.ts`; (3) role-guard helper (admin/staff/anon) decision matrix.
- Server components + service-role code are hard to unit test directly — test the pure pieces (mappers, validation, guards) and mock the SDK client for helper-level tests.

## Requirements
**Functional**
- Unit: `menu-row-to-domain` (nesting, slug→id, image mapping, sort), `settings-row-to-restaurant`, `cart-to-order-items`.
- Unit: order subtotal/total computed in `POST /api/orders` path matches `lib/pricing.ts` for representative carts.
- Unit: `require-role` — admin passes admin/staff gates; staff fails admin gate; anon fails all.
- Component (RTL): login form validation; menu-item form (required/price validation, tag select); order-status control; role-based hide/disable in menu-list.
- Integration (feasible): `create-order` round-trip with mocked Supabase client returning inserted rows.

**Non-functional**
- All tests pass; no skips/fakes; existing 46 stay green.
- `lint` + `build` clean.

## Architecture
- **Test seams:** pure mappers/validation/guards tested directly; `lib/db` helpers tested with a mocked `@supabase/*` client (boundary mock); RTL for client components with mocked actions.

## Related Code Files
**Create**
- `lib/db/mappers/menu-row-to-domain.test.ts`
- `lib/db/mappers/settings-row-to-restaurant.test.ts`
- `lib/db/mappers/cart-to-order-items.test.ts`
- `lib/auth/require-role.test.ts`
- `app/api/orders/order-persistence.test.ts` (or `lib/db/create-order.test.ts`) — SDK-mocked round-trip + pricing parity
- `components/admin/auth/login-form.test.tsx`
- `components/admin/menu/menu-item-form.test.tsx`
- `components/admin/orders/order-status-control.test.tsx`
- `components/admin/menu/menu-list.test.tsx` (role-based hide/disable)
- `test/supabase-mock.ts` (shared boundary mock helper)

**Modify**
- `docs/system-architecture.md` (admin routes, `lib/db`/`lib/supabase` boundary, data flows)
- `docs/codebase-summary.md` (new dirs: `lib/db`, `lib/supabase`, `lib/auth`, `supabase/`, `app/admin`, `components/admin`; status update)
- `docs/deployment-guide.md` (Supabase env, migrations, seed, first admin, Storage bucket)
- `docs/changelog.md` (dated admin-dashboard entry)
- `docs/features.md` (admin features + status)
- `.env.example` (final Supabase vars — confirm)
- `README.md` (Supabase setup + new scripts)

**Delete:** none

## Implementation Steps
1. `test/supabase-mock.ts`: minimal chainable mock (`from().select().eq()...`, `auth.getUser`, `storage.from().upload`) returning fixtures; boundary-only.
2. Mapper tests: feed representative joined rows, assert output equals expected `MenuCategory[]`/`MenuItem` (mirror a slice of `data/menu/*`); cover nesting, empty groups, null image, sort order.
3. `cart-to-order-items.test.ts`: given `CartLine[]`, assert frozen snapshot rows (line_total = unit*qty, options captured).
4. Pricing parity test: build carts, run the `POST /api/orders` recompute path, assert subtotal/total equal `lib/pricing.ts` outputs (guards client-tamper regression).
5. `require-role.test.ts`: mock `getSessionUser` returning admin/staff/null; assert `requireAdmin`/`requireStaff`/`requireAuth` outcomes.
6. `create-order` round-trip: mocked client, assert orders+order_items insert calls with correct payload, returns number.
7. RTL: `login-form` (empty/invalid → error, valid → calls signIn), `menu-item-form` (validation + submit payload), `order-status-control` (calls action with chosen status), `menu-list` (staff → controls absent/disabled, admin → present).
8. Run full suite (`npm test`) — new + existing all green; fix failures (never skip).
9. Update all `docs/` files + `README.md` + `.env.example`; add dated changelog entry.
10. `npm run lint` + `npm run build` clean.

## Todo List
- [ ] `test/supabase-mock.ts` boundary mock
- [ ] Mapper tests (menu, settings, cart→order_items)
- [ ] Pricing parity test (order recompute vs `lib/pricing`)
- [ ] `require-role` guard matrix test
- [ ] `create-order` round-trip (SDK-mocked)
- [ ] RTL: login-form, menu-item-form, order-status-control, menu-list role gating
- [ ] Full suite green (existing 46 + new)
- [ ] Update system-architecture / codebase-summary / deployment-guide / changelog / features
- [ ] Update README + `.env.example`
- [ ] lint + build clean

## Success Criteria
- All new + existing tests pass; nothing skipped/faked.
- Mapper tests prove domain-type parity; pricing parity test passes for pickup + delivery carts.
- Guard tests prove admin/staff/anon matrix (spec §6).
- RTL tests cover login, menu form, status control, role gating.
- `docs/` fully updated; `lint` + `build` clean.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Server components hard to unit test | Med | Low | Test pure mappers/guards/validation; mock SDK for helpers; RTL for client comps |
| Over-mocking hides real bugs | Med | Med | Mock only at SDK boundary; keep business logic real (repo rule) |
| Flaky async in RTL admin forms | Low | Low | `await` user-event + `findBy*`; follow existing test patterns |
| Docs drift from final code | Med | Low | Docs updated in this phase after code stabilized |

## Security Considerations
- Guard tests are a security control: they lock the admin/staff/anon authorization matrix against regression.
- Pricing parity test prevents client-side total tampering regressions on order persistence.

## Next Steps
- Milestone complete: mark plan `status: completed`; update `docs/changelog.md`. Optional follow-ups: admin mockup refinement (spec §16), Storage migration of seed images, order pagination.
