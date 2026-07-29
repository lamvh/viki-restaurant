# Viki Admin — rebuild to the "Viki Admin" design

Source: Claude Design project `b43bb00c-654f-446f-9ffd-7dd088e3236f`, file `Viki Admin.dc.html`.

## Scope (confirmed with user 2026-07-27)

- **In:** admin shell (rail / topbar toggle, mobile bottom tabs, warm palette) +
  rebuild of the four data-backed sections — Overview, Orders, Counter, Menu.
- **Out:** Tables, Homepage content CMS, Printers, Payments & terminals,
  End of day. No DB tables exist for them; deferred to a later phase.
- **Palette:** admin-scoped tokens only. Public site keeps its white/neutral
  tokens — zero regression risk to the SEO-critical pages.

## Design → route map

| Design section | Route | Status |
|---|---|---|
| Overview | `/admin` | rebuild |
| Counter | `/admin/pos` | rebuild |
| Orders | `/admin/orders` | rebuild |
| Menu | `/admin/menu` | rebuild |
| Content · Payments · End of day · Printers | — | nav shows them disabled ("soon"), matching the existing `soon` convention |

## Deliberate divergences from the design

The design is a static mock with invented state. Where it implies a feature that
has no data behind it, the real build drops it rather than faking it:

1. **POS dine-in/takeaway tabs + table chips** — dropped. `Service` is
   `pickup | delivery`; counter sales are `pickup`. Tables are out of scope.
2. **Orders service tabs** — All / Pickup / Delivery (design also had "Counter",
   which is not a distinct service in the schema).
3. **Overview "Loyalty points" KPI** — replaced with "Open orders", which is
   derivable. Points are only computed per-cart, never persisted.
4. **GST 15% line** — shown as a *derived display line* (`total × 3/23`). NZ
   prices are GST-inclusive, so this changes nothing about what is charged.
5. **Multi-step payment modal** (split / tip / cash-change) — the existing
   Windcave HIT terminal flow is kept. A method sheet was added offering the two
   methods that exist (card terminal, cash); splitting and tipping have no
   backend and no columns, so they are not faked.
6. **Title-bar search box** — omitted. It is decorative in the mock and there is
   no search backend; the Counter's dish search is real and was built.

## Phases — all complete

| # | Phase | File | Status |
|---|---|---|---|
| 1 | Admin design tokens + status metadata | [phase-01](./phase-01-admin-design-tokens.md) | ✅ done |
| 2 | Admin shell — rail, topbar, mobile tabs | [phase-02](./phase-02-admin-shell.md) | ✅ done |
| 3 | Overview dashboard | [phase-03-overview.md](./phase-03-overview.md) | ✅ done |
| 4 | Orders — card list + detail panel | [phase-04-orders.md](./phase-04-orders.md) | ✅ done |
| 5 | Menu + Counter | [phase-05-menu-and-counter.md](./phase-05-menu-and-counter.md) | ✅ done |

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | no warnings or errors |
| `npm test` | 182 passed across 21 files (was 174 / 20; +31 new tests, 0 removed) |
| `npm run build` | compiled, 11 static pages generated |
| Dev-server route probe (`/`, `/menu`, `/admin{,/orders,/menu,/pos,/login}`) | all 200, no server errors |
| Public-site token regression | none — `app/globals.css` change is purely additive (+24 lines) |

New tests: `lib/admin/dashboard-aggregate.test.ts` (13),
`components/admin/layout/admin-shell.test.tsx` (8),
`lib/orders/elapsed-label.test.ts` (6), `lib/pricing-gst.test.ts` (4).

## Not verified

The authenticated shell was exercised through its component test rather than a
signed-in browser session — no admin credentials were used. A manual pass on a
real login is still worth doing, along with a device check at the 820px and
1120px breakpoints.

## Follow-up

Tables, homepage content CMS, Printers, Payments & terminals and End of day are
designed but unbuilt; each needs schema before UI. They appear in the admin nav
as disabled rows.
