# Viki — Project Backlog

Standing tracker across milestones. Items graduate from here into a dated plan
folder under `plans/` when picked up.

**Legend:** 🔴 blocker · 🟠 should do next · 🟡 worth doing · ⚪ someday · ✅ done

Last reviewed: 2026-07-27 (after terminal milestone code completion)

---

## Active milestone

**[Terminal payment (Windcave HIT)](./20260727-viki-terminal-payment/plan.md)** — 8 phases,
**code complete, live UAT outstanding**. Phases 01–07 done; Phase 08 has its
automated tests and docs done, but the runbook has not been executed against the
physical terminal.

Outstanding before this can be called finished:

| | Item |
|---|---|
| 🔴 | Run [`terminal-payment-uat-runbook.md`](../docs/terminal-payment-uat-runbook.md) T1–T11 with the terminal — **T5/T6 (interrupted sale) especially** |
| 🔴 | Confirm tipping is off for this MID |
| 🔴 | Book POS certification with Windcave |
| 🟠 | `npm run build` — not run while the dev server was live (they share `.next`) |

## On hold

**[Online card payment (REST / HPP)](./20260727-viki-online-payment/plan.md)** — 22h, 4 phases.
Paused 2026-07-27 in favour of the terminal channel. Resumes on a finished order
path; needs no further schema work. Has one **known unwritten phase** (checkout
card option, retry, paid/failed states) noted in its plan.

---

## Blockers

| | Item | Notes |
|---|---|---|
| 🔴 | **Rotate the leaked HIT key and Payline password** | The terminal onboarding email exposed `ScrHITKey` and the `VinapageUAT_Payline` password in plain text through an untrusted channel. **Rotate both in Payline before wiring anything up** — otherwise the first thing the integration does is authenticate with a leaked key. Neither value is in any tracked file. |
| ✅ | **`WINDCAVE_HIT_KEY` in `.env.local`** | In place; the terminal authenticates. |
| ✅ | **`WINDCAVE_HIT_VENDOR_ID`** | Real Windcave-assigned value is set in `.env.local`. The code no longer falls back to a placeholder — a missing value now fails fast with a named-variable error. |
| 🔴 | **Windcave POS certification** | Mandatory before the **card-present** channel runs in production. Windcave asks for as much notice as possible — book at milestone **start**, not end. |
| ✅ | **Physical terminal delivery** | Received, on hand, and **charging successfully** as of 2026-07-27. |
| ✅ | **Terminal pre-flight** | Done — the connection spike ran a real sale end to end. |
| ⏸️ | **Windcave eCom certification** | For the **online** channel — a separate booking from POS certification. Deferred with that milestone. |
| ⏸️ | **`WINDCAVE_API_KEY` not yet generated** | REST key for `VinapageUAT_API`, distinct from the HIT key. Needed only when online payment resumes. |
| ⏸️ | **Public HTTPS URL for FPRN** | Tunnel or Vercel preview. Online channel only — the terminal channel needs no inbound callback. |

---

## Surfaced by the payment design (spec §14)

These were deliberately scoped out, and each becomes more pressing once real
money is moving.

| | Item | Why it matters |
|---|---|---|
| 🟠 | **Order confirmation email** | On a redirect payment flow the customer's only record is one browser tab. Closing it loses the order reference. The `email` column is captured from Phase 02 onward, so the data is already there. |
| 🟠 | **Staff order workflow UI** | Paid orders will start arriving with nowhere to work them — the admin dashboard is metrics-only. Kitchen needs a queue with status transitions. Possibly already partly built; see the audit item below. |
| 🟡 | **Delivery address validation** | Free-text with no bounds today. Once payment is real, an out-of-range delivery becomes a refund rather than an inconvenience. Consider a suburb allowlist or a radius check. |
| 🟡 | **Abandoned `pending_payment` cleanup** | Orders where the customer never paid and FPRN never fired accumulate. A scheduled sweep to `cancelled` after N hours keeps the table honest. |
| ⚪ | **Refunds from admin** | Currently done in the Payline portal. Fine at low volume. |
| ⚪ | **Tokenisation / stored cards** | Windcave supports it. Only worth it if repeat-customer friction becomes a real complaint. |
| ⚪ | **Apple Pay** | Blocked on completing domain-registration steps 1–2 with Windcave and receiving a MID. HPP means enabling it later needs **no code change**. |
| ⚪ | **Drop-In embedded checkout** | Keeps customers on-site. The `links` array is stored intact specifically so this becomes a frontend-only change. Revisit if redirect drop-off looks bad. |

---

## Documentation to extract

| | Item | Notes |
|---|---|---|
| 🟠 | **Rewrite the HIT integration doc as a reusable guide** | `docs/windcave-integration.md` is currently Viki-specific (this account, this station, this app's routes). Rewrite the terminal half as a **standalone guide to integrating a Windcave HIT device**, portable to other projects and kept in this repo as the reference copy. Should cover: the XML envelope (`user`/`key` as root attributes, field order matters), `VendorId` being required, the `Response`/`TransactionIsComplete` rejection shape, two-letter `Result` codes, `AmtA` in **cents**, button presses as a separate `TxnType=UI`, no `Cancel` TxnType, and the persist-`TxnRef`-before-POST rule for recovering an interrupted sale. All eleven facts were verified against a live terminal — that empirical grounding is the part worth keeping, since several contradict a plain reading of the spec PDF. Keep account-specific values out; make it a guide, not a config file. |

---

## Surfaced by the terminal design

| | Item | Why it matters |
|---|---|---|
| ✅ | **Remove the terminal spike surface** | `/admin/terminal-test` deleted in Phase 07, along with its panel and debug dumps. `terminal-display.tsx` survives — the real dialog reuses it. |
| 🟡 | **Should cash settlement be admin-only?** | Marking an order paid in cash is the one action that records money received with no gateway trail. Currently any staff role can. Say the word and it becomes `requireAdmin()`. |
| ✅ | **Full counter POS** | **Built 2026-07-27** at `/admin/pos`, reversing the earlier deferral. The original scope assumed every order arrived online first, which is backwards for a counter terminal. Reuses `createOrder`, so pricing and recovery are shared. |
| 🟡 | **Option customisation at the till** | Tapping a dish uses its default options. Fine today — no menu item has option groups — but a "Large / add egg" dish would need a modal at the counter. |
| 🟡 | **Reprint a card receipt** | `getReceipt(txnRef, duplicate)` is implemented in `hit-client.ts` but not yet surfaced in the UI. Useful when a customer asks for another copy of the card slip. |
| ⚪ | **Refunds via HIT** | `TxnType=Refund` exists in the protocol. Using Payline is fine at low volume. |
| ⚪ | **Multiple terminals** | One station id, hardcoded from config. Revisit only if a second reader appears. |
| ⚪ | **Split bill / tipping** | Confirmed not wanted. The amount-mismatch guard stays as a safety net; if it ever fires, tipping was switched on somewhere. |

---

## Audit / verify

| | Item | Notes |
|---|---|---|
| 🟠 | **Reconcile admin-dashboard plan status** | `plans/20260722-viki-admin-dashboard/plan.md` marks phases 03–08 pending, but commit `4c795b5` ("full-stack admin dashboard with settings and user management") suggests more shipped than the file records. Verify what actually exists and correct the plan — a stale plan is worse than no plan. |
| 🟠 | **Menu data is static, not DB-backed** | `data/menu/*.ts` is still the source of truth; `lib/db` has only `get-dashboard-metrics.ts`. The payment work reads prices from the static files through one function so the later swap is a single call site. Admin menu edits do not currently drive the public site. |

---

## Content debt

| | Item | Notes |
|---|---|---|
| 🟡 | **18 dish photos outstanding** | 8 verified real dishes shipped; the rest render `ImageSlot` placeholders. Needs real photography, not stock. |
| 🟡 | **Allergen tags need real data** | Currently only `GF`/`DF`/`VEG`/`R18` tags where known. Publishing wrong allergen data is a safety issue — leave blank rather than guess. |

---

## Technical debt

| | Item | Notes |
|---|---|---|
| ✅ | **`orders_anon_insert` RLS hole** | Dropped in `0005`. Verified: anon insert refused (42501), anon reads of `orders` / `payment_events` return zero rows against a seeded row. |
| 🟡 | **No transaction across order + items insert** | Supabase's REST client cannot do multi-table transactions; terminal Phase 04 uses a compensating delete. Replace with a Postgres function if orphans ever appear in practice. |
| 🟡 | **Client and server both compute pricing** | Same module (`lib/pricing.ts`) both sides, so they cannot drift — but the duplication is worth remembering when changing discount rules. |
| ⚪ | **`tsconfig.tsbuildinfo` is committed** | Build artefact in git. Add to `.gitignore`. |

---

## Review cadence

Re-read this file at the start of each milestone. Move anything picked up into a
dated `plans/` folder; mark it ✅ here with a pointer rather than deleting, so the
history of what was consciously deferred survives.
