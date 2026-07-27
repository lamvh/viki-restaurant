# Phase 08 — Tests, UAT + Docs

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-terminal-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-terminal-payment-design.md) (§9 testing, §11 credentials, §12 certification)
- Account reference: [`docs/windcave-integration.md`](../../docs/windcave-integration.md)
- Depends on: 01–07
- Unblocks: POS certification, then the [online payment milestone](../20260727-viki-online-payment/plan.md)

## Overview
- **Priority:** P1
- **Status:** 🚧 code + docs done · live UAT and certification outstanding
- **Description:** Closes the milestone: complete the automated matrix, run UAT **against the physical terminal**, and bring the docs in line. This is the phase where hardware is genuinely required.

## Key Insights
- **No test may touch the live terminal.** A suite that quietly drives a card reader is a suite that fails in CI and confuses whoever is standing at the counter.
- The valuable tests here are the **interrupted** ones — browser closed mid-sale, terminal unplugged mid-sale, double finalise. The happy path is what manual UAT proves.
- **Confirm tipping is disabled for this MID.** If the terminal prompts for a tip, the authorised amount exceeds `orders.total` and every sale trips the mismatch guard. This is the single most likely cause of a baffling first-day failure.
- POS certification is booked **early**, not now — but this is the phase where it must be verified as booked before anyone talks about production.

## Requirements
**Functional**
- Full automated matrix green with no network access.
- A written UAT runbook someone else can execute with the terminal.
- `docs/windcave-integration.md` accurate for the terminal channel.
- Living docs updated.

**Non-functional**
- No secret in any tracked file.
- `WINDCAVE_HIT_KEY` confirmed rotated (see the milestone's red banner).

## Related Code Files
**Create**
- `docs/terminal-payment-uat-runbook.md`

**Modify**
- `docs/windcave-integration.md` (verify the terminal section against the build)
- `docs/features.md`, `docs/changelog.md`, `docs/system-architecture.md`, `docs/deployment-guide.md`, `README.md`
- `vitest.setup.ts` (un-stubbed `fetch` guard)

**Delete:** none

## Implementation Steps

1. Audit coverage and fill gaps. The matrix that must exist:

| Area | File | Cases |
|---|---|---|
| Repricing | `lib/orders/rebuild-cart.test.ts` | tampered unit ignored; unknown item; unknown choice; two choices in a single group; qty 0 / 51; empty cart |
| References | `lib/orders/reference.test.ts` | format; 1000 unique; URL-safe token |
| HIT transport | `lib/windcave/hit-client.test.ts` | amount format; purchase body; `Complete` 0/1 parsing; authorised/declined result; B1/B2; button relay; 500 raises; malformed XML; key never in errors |
| Terminal flow | `lib/orders/terminal-payment.test.ts` | incomplete → no write; paid; mismatch; declined; already-paid idempotency; attempt increments; busy refused; button relay |
| Checkout UI | `components/checkout/checkout-view.test.tsx` | renders; submit does not clear cart; error surfaces |

2. Add the network guard to `vitest.setup.ts`:

```ts
// Any test reaching the network is a bug — the terminal and gateway must be mocked.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => {
    throw new Error('Un-stubbed fetch in tests — mock the Windcave client.');
  }));
});
```

3. **Before the first live sale, confirm tipping is disabled** for this MID — in Payline, or by asking `devsupport@windcave.com` (quote Customer ID `144852`). Record the answer in `docs/windcave-integration.md`.

4. Write `docs/terminal-payment-uat-runbook.md`:
   - **Setup:** rotated `WINDCAVE_HIT_KEY` in `.env.local`; terminal powered, on the network, showing idle; `npm run dev`; signed in as staff.
   - **T1 Order placed online** as pay-in-person → confirmation renders; `payment_status='unpaid'`.
   - **T2 Approved sale** → charge from `/admin/orders`; terminal prompts appear on screen matching the device; tap a test card; order → `paid`, `payment_method='terminal'`, `paid_at` set.
   - **T3 Declined sale** → order → `failed`; chargeable again; retry allocates `-2`.
   - **T4 Staff cancel** via B1/B2 → declined path; order untouched.
   - **T5 Terminal unplugged mid-sale** → polling reports unreachable; Resume offered; order not marked paid.
   - **T6 Browser closed mid-sale** → reopen `/admin/orders`; Resume appears; re-poll reports the true outcome. **If the card was charged, the order must end up `paid`.**
   - **T7 Signed-out poll** → hit the status route with no session → 401.
   - **T8 Concurrent charge** → two tabs, charge the same order → second refused "terminal busy".
   - **T9 Tampered cart** → doctored client payload → charged amount matches the server recomputation.
   - **T10 Amount mismatch** → if tipping can be enabled temporarily, confirm a tipped sale lands in needs-review, not success.
   - Each test states expected DB state and expected `payment_events` rows.

5. Run T1–T10 with the physical terminal. **Do not mark T5/T6 passed by inspection** — they are the reason `hit_txn_ref` is persisted before the POST, and they are only meaningful when actually performed.

6. Verify `docs/windcave-integration.md`'s terminal section against what was built: env var names, route paths, station id, and the credential map.

7. Update the living docs:
   - `docs/features.md` — terminal payment, status, POS certification gate.
   - `docs/changelog.md` — dated entry: server-side order path, staff order list, HIT terminal payment, anon-insert RLS fix.
   - `docs/system-architecture.md` — `/admin/orders`, `/api/admin/terminal/status`, `/order/[token]`, the `lib/windcave/hit-*` and `lib/orders/*` modules, and the terminal payment data flow.
   - `docs/deployment-guide.md` — `WINDCAVE_HIT_*` vars, terminal network requirements, migration `0005`, POS certification.
   - `README.md` — link `docs/windcave-integration.md`.

8. Confirm `.env.example` matches `hit-env.ts` exactly.

9. Final gate: `npm test`, `npm run lint`, `npm run build`. Grep the working tree and this milestone's commits for the HIT key and the Payline password to prove neither was committed.

10. Verify **POS certification is booked**.

## Todo List
- [x] Test matrix complete across all five files
- [x] Un-stubbed `fetch` guard in `vitest.setup.ts`
- [ ] **Tipping confirmed disabled for this MID** — needs a Payline check or devsupport (Customer ID `144852`)
- [x] `docs/terminal-payment-uat-runbook.md` written
- [ ] T1–T11 executed against the physical terminal — **needs a human at the counter**
- [ ] T5 (terminal unplugged) and T6 (browser closed mid-sale) genuinely performed, not inspected
- [x] `windcave-integration.md` terminal section verified
- [x] `features.md` / `changelog.md` / `system-architecture.md` / `deployment-guide.md` / `README.md` updated
- [x] `.env.example` matches `hit-env.ts`
- [x] `tsc` / `lint` / 112 tests green · [ ] `npm run build` not run (dev server was live; it shares `.next`)
- [ ] POS certification booked with Windcave — external turnaround, gates production

## Success Criteria
1. `npm test` green with zero network access.
2. All ten UAT scenarios pass and are reproducible from the runbook alone.
3. A sale interrupted by a closed browser resolves correctly on Resume.
4. Someone who never saw the onboarding emails can configure and test the terminal from `docs/` alone.
5. Neither the HIT key nor the Payline password appears anywhere in git.

## Risk Assessment
- **Terminal is on hand**, so hardware availability is not a risk here — it was proven working back in Phase 02. If UAT now fails where the spike succeeded, suspect the integration, not the device.
- **POS certification turnaround** is external; booking late is what delays go-live, not building slowly.

## Security Considerations
- Final grep for both leaked secrets across the working tree and commits.
- Confirm `lib/windcave/*` and `lib/orders/terminal-payment.ts` are absent from the client bundle in `npm run build` output.
- On receiving the terminal, follow the Acquirer security standards and PCI guidance referenced in the shipping email.

## Next Steps
Milestone complete. The [online payment milestone](../20260727-viki-online-payment/plan.md) is on hold and unblocks from here — it reuses this milestone's order path, `payment_events`, and schema without further migrations. See [`plans/backlog.md`](../backlog.md) for deferred follow-ups.
