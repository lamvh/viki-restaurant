# Phase 05 — Deferred sections: decision brief

**Priority:** ⚪ decision needed · **Status:** brief only, not an implementation plan

Seven designed sections have no route. Each needs a schema milestone before any
UI is worth drawing, so this file sizes them rather than planning them. Pick the
ones you want; each becomes its own dated plan folder.

## The seven

| Section | Design lines | New tables / columns | Est. | Notes |
|---|---|---|---|---|
| **Content** (homepage CMS) | 573–634 | extend `settings`: `promo_text`, `promo_on`, `hero_headline`, `hero_sub`, `hero_image`, `story_on`, `story_head`, `story_body` | S–M | `settings` already exists with name/tagline/blurb/address/phone. **Cheapest of the seven.** Live-preview pane is a static render. Featured-dish chips overlap Phase 04. |
| **Payments & terminals** | 700–756 | `terminals`, `payment_rules`; transactions read from existing `payment_events` | M | Transaction list is largely a **read** over data already captured. Terminal pairing is config today (one hardcoded station id — see backlog "Multiple terminals"). Refund button ⚠️ real money; Payline-only is the current policy. |
| **End of day** (Z-report) | 758–857 | `shifts`, `cash_counts`; aggregates from `orders` + `payment_events` | M | Payment mix, service split and top sellers are all derivable now. Cash drawer / float / variance need the two new tables. Voids + discounts need columns `orders` does not have. |
| **Printers** | 636–698 | `printers`, `print_jobs`, `routing_rules` | M–L | Needs a **print transport decision first** — the browser cannot reach a LAN thermal printer. Today printing is `window.print()` on `/receipt`. Real kitchen tickets mean a local print agent or a cloud-print service. Do not start the UI before that call. |
| **Tables** | 325–360 | `tables`, `table_sessions`; `orders.table_id`; `service` gains `dinein` | M–L | Ripples outward: POS gains dine-in/takeaway tabs + table chips, Orders gains a Counter/dine-in service filter, Payments gains open-table settlement. Currently `service` is `pickup \| delivery` only. |
| **Food & stock** | 859–936 | `ingredients`, `recipe_links`, `purchase_orders`, `po_lines`, `suppliers` | L | Biggest of the seven. Also introduces auto-86: an ingredient at zero hides its dishes from the till (design line 557 draws this state on the Dishes tab). Real value, real data-entry burden on staff. |
| **Staff & roles** | 938–1001 | extend `profiles`: `phone`, `pin`, `active`; add `manager` role; `role_permissions` | M | `profiles` is `admin \| staff` today. Design adds a third role, per-role section access, PIN login, shift display, and a "preview menu as" mode (design lines 141–147). ⚠️ PIN auth is a **security decision**, not a UI one — a 4-digit PIN is not a password. |

## Recommended order

1. **Content** — cheapest, mostly extends an existing table, immediate marketing value.
2. **End of day** — managers ask for it daily; most figures already derivable.
3. **Payments** — mostly a read over `payment_events`; pairs with End of day.
4. **Staff & roles** — unblocks the role-preview banner and per-role nav.
5. **Tables / Printers / Stock** — each is a milestone of its own, and Printers is
   blocked on a transport decision before design work begins.

## Nav consequence either way

Regardless of what gets built, `lib/admin/nav-items.ts` is currently wrong in two
directions:

- It lists four `soon` rows (`/admin/content`, `/admin/payments`, `/admin/report`,
  `/admin/printers`) that render as permanently disabled text. Rendered as
  disabled, so no 404 — but four dead rows is a third of the rail.
- It omits **Tables**, **Food & stock** and **Staff & roles** entirely, so the
  design's 11-section nav shows as 8.

Decide one policy: either the nav mirrors the design and disabled rows carry a
"planned" tooltip, or it lists only what exists. Half-and-half is what it does now.

## Open questions

1. Which sections are actually wanted, and in what order?
2. Printers — is a local print agent acceptable, or does kitchen printing stay
   manual (`window.print()` on the receipt route)?
3. Staff PINs — acceptable for till access, or should staff auth stay
   password/Supabase only?
4. Nav policy for unbuilt sections (above).
