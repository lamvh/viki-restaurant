# Terminal Payment — UAT Runbook

Repeatable manual test script for the Windcave HIT card-present channel. Every
step below needs the **physical CHU200TP** (station `3425240086`); none of it can
be verified by inspection.

- **Account reference:** [`windcave-integration.md`](./windcave-integration.md)
- **Design spec:** [`superpowers/specs/2026-07-27-viki-terminal-payment-design.md`](./superpowers/specs/2026-07-27-viki-terminal-payment-design.md)

## Setup

1. `.env.local` carries `WINDCAVE_HIT_USER`, `WINDCAVE_HIT_KEY` (rotated),
   `WINDCAVE_HIT_STATION=3425240086`, `WINDCAVE_HIT_URL` pointing at UAT.
2. Terminal powered on, network-reachable (**TCP port 65** to
   `uatscr.windcave.com`), showing idle.
3. `npm run dev`, signed in at `/admin/login`.
4. **Confirm tipping is off for this MID.** A tip pushes the authorised amount
   above the order total and trips the mismatch guard on every sale — the single
   most likely cause of a baffling first-day failure.

## Tests

Each test states what to do, then what must be true in the database
(`orders`, `payment_events`) afterwards.

### T1 — Order placed online
Place an order through `/checkout` as a customer.

- Redirects to `/order/<token>`; page shows reference, items, total.
- `orders`: one row, `payment_status='unpaid'`, `status='new'`, `payment_method='cash'`.
- The cart is empty **only after** the confirmation page renders.

### T2 — Approved sale
`/admin/orders` → **Take card payment** → tap a test card.

- Dialog mirrors the terminal's own prompts, changing in step with the device.
- Order → `payment_status='paid'`, `payment_method='terminal'`, `paid_at` set,
  `windcave_transaction_id` populated.
- `payment_events`: `terminal_started` then `terminal_completed`.
- **Check the result card's Tip field reads 0.00.** Anything else means tipping
  is enabled.

### T3 — Declined sale
Charge again using a card that declines.

- Dialog shows **Declined** with the terminal's own reason text.
- Order → `payment_status='failed'`; still chargeable.
- **Try again** allocates `…-2`, not the same `TxnRef`. Verify in `orders.hit_txn_ref`.

### T4 — Staff cancel
Start a sale, then press the on-screen **CANCEL** while the terminal offers it.

- The terminal aborts.
- Order → `failed`; untouched otherwise.
- If the terminal offers no button, the Cancel control is disabled and the label
  says so — cancel on the device instead. That is a protocol limit, not a bug:
  HIT has no POS-initiated cancel.

### T5 — Terminal unplugged mid-sale
Start a sale, then pull the terminal's network cable.

- Dialog reports the terminal is not responding; stops after ~2 minutes.
- Order stays `pending` with `hit_txn_ref` set — **not** marked paid.
- Reconnect, reopen `/admin/orders`: **Resume payment** appears.

### T6 — Browser closed mid-sale ⭐
Start a sale, **close the browser tab entirely**, complete the payment on the
terminal, then reopen `/admin/orders`.

- **Resume payment** appears on the order.
- Resuming reports the true outcome. **If the card was charged, the order must
  end up `paid`.**

This is the reason `hit_txn_ref` is written before the terminal request goes out.
Do not mark it passed by inspection.

### T7 — Unauthenticated poll
Sign out (or use a private window) and request
`/api/admin/terminal/status?orderId=<id>`.

- **401.** No terminal interaction occurs.

### T8 — Concurrent charge
Open `/admin/orders` in two tabs; charge the same order from both.

- Second attempt refused with "The terminal is busy with another payment."
- Exactly one `terminal_started` event for that attempt.

### T9 — Tampered cart
Intercept the checkout request and alter quantities or inject a price field.

- The charged amount equals the **server** recomputation from menu prices.
- Unknown item or option ids are rejected outright.

### T10 — Cash settlement
On an `unpaid` or `failed` order, press **Mark paid (cash)**.

- Order → `payment_status='paid'`, `payment_method='cash'`, `paid_at` set.
- `payment_events`: `settled_cash`.
- The button is absent on an order already `paid` or mid-sale (`pending`).

### T11 — Dashboard exclusion
Leave an order at `pending_payment`.

- It appears in neither dashboard revenue nor the open-order count.

## After the run

- Record anything surprising in
  [`windcave-integration.md`](./windcave-integration.md) — that file is the
  standing record of what the live service actually does.
- **POS certification** must be booked with Windcave before production. It is an
  external turnaround and gates go-live regardless of test results.
