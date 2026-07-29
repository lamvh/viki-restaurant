# Phase 05 — Menu & Counter

**Priority:** high
**Status:** planned

## Menu (`/admin/menu`)

The design shows a flat card grid with category *tabs*, replacing the current
per-category sections.

- **Category tabs** — All + one per category, with counts.
- **Dish card** — thumbnail, name, price, category · sold-today, an availability
  switch, and an Edit button. Unavailable dishes render at reduced opacity.
- **Edit modal** — name, price, category, dietary tags, availability switch,
  Save, and Delete (admin only). "+ New dish" in the title bar opens the same
  modal in create mode.

The existing `menu-item-row.tsx` inline-edit affordance is replaced by the modal.
Its server actions (`app/admin/menu/actions.ts`) are reused unchanged — this is a
presentation change, not a contract change. The modal needs a `categoryId`, which
the create action already takes.

`listMenuForAdmin()` gains `tags`, `imageUrl` and `soldToday` so the card can
render without a second read.

### Files

- **Modify** `lib/db/list-menu-admin.ts`
- **Create** `components/admin/menu/menu-category-tabs.tsx`
- **Create** `components/admin/menu/menu-item-card.tsx`
- **Create** `components/admin/menu/menu-item-dialog.tsx` (client)
- **Create** `components/admin/menu/availability-switch.tsx`
- **Modify** `app/admin/menu/page.tsx`, `app/admin/menu/actions.ts` (accept tags)
- **Delete** `components/admin/menu/menu-item-row.tsx`,
  `components/admin/menu/add-menu-item.tsx` (superseded by the modal)

## Counter (`/admin/pos`)

Rebuild `PosScreen` to the design's full-height two-pane till.

- **Header** — "Counter", ticket number, operator, dish search.
- **Category tabs**, then an image tile grid; a tile carries a dark quantity
  badge once it is on the ticket.
- **Ticket panel** — lines with −/+ steppers, subtotal, GST 15% (incl.), total,
  and a full-width "Take payment · $X" button.
- **Mobile** — the ticket collapses to a dark summary bar that opens a
  full-screen sheet.

### Deliberate omissions

The design's dine-in/takeaway tabs and table chips are dropped: `Service` is
`pickup | delivery`, counter sales are `pickup`, and Tables is out of scope.
Inventing the control without the feature behind it would be a dead switch.

### GST line

Display-only, derived as `total × 3 / 23`. NZ menu prices are GST-inclusive, so
this reveals the tax already inside the total and changes no charge. It never
touches `lib/pricing.ts`.

### Files

- **Create** `lib/pricing-gst.ts` + test — `gstIncludedIn(total)`
- **Create** `components/admin/pos/pos-tile-grid.tsx`
- **Create** `components/admin/pos/pos-ticket-panel.tsx`
- **Create** `components/admin/pos/pos-mobile-bar.tsx`
- **Modify** `components/admin/pos/pos-screen.tsx` (layout + wiring only)
- **Modify** `components/admin/orders/terminal-payment-dialog.tsx` (restyle)
- **Modify** `app/admin/pos/page.tsx` — full-bleed, no title bar
- **Delete** `components/admin/pos/pos-cart.tsx`,
  `components/admin/pos/pos-menu-grid.tsx` (superseded)

## Success criteria

- Ringing up and charging a counter sale still goes through `createCounterOrder`
  → `createOrder`; the client never sends a price.
- Toggling availability in the modal is reflected on the public menu.
- GST helper is unit-tested; `lib/pricing.ts` is untouched.
