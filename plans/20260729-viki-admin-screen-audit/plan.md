# Viki Admin — full screen audit & state pass

Source of truth: Claude Design project `b43bb00c-654f-446f-9ffd-7dd088e3236f`,
file `Viki Admin.dc.html` (2,541 lines, 11 sections + 5 overlays), read
2026-07-29 via the DesignSync MCP.

Follows on from [20260727-viki-admin-design-rebuild](../20260727-viki-admin-design-rebuild/plan.md),
which rebuilt 4 of the 11 designed sections. This plan sweeps **every** screen,
page, empty state and loading state — built and unbuilt.

## Audit — design sections vs. what exists

| # | Design section | Route | State |
|---|---|---|---|
| 1 | Overview | `/admin` | ✅ built |
| 2 | Counter (POS) | `/admin/pos` | ✅ built |
| 3 | Orders | `/admin/orders` | ✅ built |
| 4 | Menu — **Dishes** tab | `/admin/menu` | ✅ built |
| 5 | Menu — **Categories** tab | — | ❌ missing (schema exists) |
| 6 | Menu — **Homepage menu** tab | — | ❌ missing (schema exists) |
| 7 | Content (homepage CMS) | `/admin/content` | ⛔ nav "soon" — partial schema |
| 8 | Payments & terminals | `/admin/payments` | ⛔ nav "soon" — needs schema |
| 9 | End of day (Z-report) | `/admin/report` | ⛔ nav "soon" — needs schema |
| 10 | Printers | `/admin/printers` | ⛔ nav "soon" — needs schema |
| 11 | Tables | — | ⛔ **not even in nav** — needs schema |
| 12 | Food & stock | — | ⛔ **not even in nav** — needs schema |
| 13 | Staff & roles | — | ⛔ **not even in nav** — needs schema |

Overlays: product-edit modal ✅ · POS ticket sheet ✅ · terminal payment ⚠️ partial
(by design) · **mobile order-detail overlay ❌** · **toast ❌** · role-preview banner ⛔.

## The headline finding

**There is not one `loading.tsx`, `error.tsx` or `not-found.tsx` in the repo.**
Every admin route is `dynamic = 'force-dynamic'` + async server component, so
each navigation and each Orders filter click blocks on a database round-trip with
zero feedback, and a Supabase outage lands on Next.js's unstyled default error
page. This is the single highest-value fix and it touches every screen.

## Phases

| # | Phase | Cost | New schema |
|---|---|---|---|
| 1 | [Route loading, error & not-found boundaries](./phase-01-route-loading-and-error-boundaries.md) | S | no |
| 2 | [Empty-state sweep](./phase-02-empty-state-sweep.md) | S | no |
| 3 | [Pending feedback, toast & mobile order overlay](./phase-03-feedback-and-mobile-overlay.md) | M | no |
| 4 | [Menu section completion — Categories + Homepage tabs](./phase-04-menu-section-completion.md) | M | no |
| 5 | [Deferred sections — decision brief](./phase-05-deferred-sections.md) | — | yes (all) |

Phases 1–3 are independent of each other and of 4; any order works. Phase 5 is a
brief, not an implementation — it needs a scope call from the user first.

## Deliberate non-goals

Carried forward from the previous plan and still true: split-bill, tipping, dine-in
service type, and the decorative title-bar search stay unbuilt — no backend, no
columns, and tipping is confirmed unwanted (see `plans/backlog.md`).

## Open questions

1. Phase 5 — which unbuilt sections are actually wanted, and in what order?
   Tables / Stock / Staff each need a schema milestone of their own.
2. Should the nav keep showing 4 permanently-disabled "soon" rows, or hide them
   until their route exists?
