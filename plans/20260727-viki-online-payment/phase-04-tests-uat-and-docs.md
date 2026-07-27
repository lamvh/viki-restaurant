# Phase 07 — Tests, UAT Runbook + Docs

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-online-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-online-payment-design.md) (§10 testing, §12 documentation)
- Account reference: [`docs/windcave-integration.md`](../../docs/windcave-integration.md) — **already written**, verify and extend
- Depends on: 02–06
- Unblocks: production certification submission

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Closes the milestone: the full automated test matrix, a repeatable manual UAT runbook, and the living documentation. `docs/windcave-integration.md` already exists (written ahead of implementation so the onboarding email was not the only copy) — this phase verifies it against what was actually built.

## Key Insights
- **No test may touch the live gateway.** A suite that silently hits UAT is a suite that fails in CI and burns test transactions. Mock `fetch` everywhere; assert that unstubbing causes loud failure, not silent network access.
- The high-value tests are the **adversarial** ones — tampered totals, forged callbacks, duplicate FPRNs — not the happy path. The happy path is what manual UAT proves.
- **Certification is the real blocker to go-live**, not code completeness. Submit the eCom certification form early; it gates production regardless of how finished the integration is.
- The `.env.example` block must stay in lockstep with `lib/windcave/env.ts`. A variable added to one and not the other is a runtime failure nobody catches until payment time.

## Requirements
**Functional**
- Automated coverage for repricing, reference generation, client transport, and reconcile decisions.
- A written UAT runbook someone else can execute unaided.
- `docs/windcave-integration.md` accurate against the shipped code.
- `docs/` living documents updated.

**Non-functional**
- `npm test` green with no network access.
- No secret values in any committed file — the API key is referenced by name only.

## Related Code Files
**Create**
- `docs/windcave-payment-uat-runbook.md`

**Modify**
- `docs/windcave-integration.md` (verify against implementation; fill the "as built" gaps)
- `docs/features.md` (payment feature + status)
- `docs/changelog.md` (dated entry)
- `docs/system-architecture.md` (payment routes, modules, data flow)
- `docs/deployment-guide.md` (Windcave env vars, tunnel setup, certification gate)
- `README.md` (link the Windcave reference)

**Delete:** none

## Implementation Steps

1. Audit test coverage against the spec and fill gaps. The matrix that must exist by the end:

| Area | File | Cases |
|---|---|---|
| Repricing | `lib/orders/rebuild-cart.test.ts` | tampered unit ignored; unknown item; unknown choice; two choices in a single group; qty 0 / 51; empty cart |
| References | `lib/orders/reference.test.ts` | format; 1000 unique; URL-safe token |
| Transport | `lib/windcave/client.test.ts` | basic auth header; amount as string; 202 accepted; 401 raises; network failure distinguished; malformed JSON; `hppUrl` selection and absence; id encoding |
| Reconcile | `lib/windcave/reconcile.test.ts` | paid; amount mismatch; already-paid no-op; declined; still pending; query failure; no session id; picks authorised among several |
| Checkout UI | `components/checkout/checkout-view.test.tsx` | renders; submit does not clear cart; error surfaces |

2. Add an explicit guard test asserting the suite never reaches the network — e.g. a `vitest.setup.ts` addition that throws on any un-stubbed `fetch`:

```ts
// Any test that reaches the network is a bug — Windcave calls must be stubbed.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => {
    throw new Error('Un-stubbed fetch in tests — mock the Windcave client.');
  }));
});
```

3. Write `docs/windcave-payment-uat-runbook.md` — a numbered, repeatable script:
   - **Setup:** `.env.local` values; start a tunnel; set `WINDCAVE_NOTIFICATION_BASE_URL` to the tunnel origin; `npm run dev`.
   - **T1 Cash order** → confirmation renders, `payment_status='unpaid'`, `status='new'`.
   - **T2 Card approved** → 3DS card `5588 8800 0007 7770`, SecureCode `123`, any future expiry → `paid`, `status='new'`, `paid_at` set.
   - **T3 Card declined** → cart intact, retry opens a **new** session id.
   - **T4 Abandoned tab** → close at the Windcave page; FPRN alone marks it paid.
   - **T5 Forged callback** → `/order/return/{token}?outcome=approved` on an unpaid order changes nothing.
   - **T6 Duplicate FPRN** → POST the FPRN URL five times; exactly one `marked_paid` event.
   - **T7 Tampered cart** → doctored client payload; charged amount matches the server recomputation.
   - **T8 Dashboard** → a `pending_payment` order appears in neither revenue nor the open queue.
   - Each test states expected DB state and expected `payment_events` rows.

4. Verify `docs/windcave-integration.md` against the built code — every env var name, route path, and behaviour claim. Correct anything that drifted, and fill the "as built" route table.

5. Update the living docs:
   - `docs/features.md` — online card payment, its status, and the certification gate.
   - `docs/changelog.md` — dated entry covering the server-side order path, Windcave HPP, FPRN, and the anon-insert RLS fix.
   - `docs/system-architecture.md` — `/order/[token]`, `/order/return/[token]`, `/api/windcave/fprn`; the `lib/windcave/*` and `lib/orders/*` modules; the payment data flow.
   - `docs/deployment-guide.md` — Windcave env vars, tunnel vs preview deployment for FPRN, migration `0005` (and `0006` if used), and **certification before production**.
   - `README.md` — link `docs/windcave-integration.md`.

6. Confirm `.env.example` and `lib/windcave/env.ts` list exactly the same variables.

7. Final gate: `npm test`, `npm run lint`, `npm run build` all green. Grep the repo for the API key value to prove it was never committed.

8. Submit the Windcave eCom certification form if not already done.

## Todo List
- [ ] Test matrix complete across all five files
- [ ] Un-stubbed `fetch` guard in `vitest.setup.ts`
- [ ] `docs/windcave-payment-uat-runbook.md` written
- [ ] Full UAT run T1–T8 executed and passing
- [ ] `docs/windcave-integration.md` verified against the build
- [ ] `features.md` / `changelog.md` / `system-architecture.md` / `deployment-guide.md` / `README.md` updated
- [ ] `.env.example` matches `env.ts`
- [ ] `test` / `lint` / `build` green; no secret committed
- [ ] eCom certification form submitted

## Success Criteria
1. `npm test` green with zero network access.
2. All eight UAT scenarios pass and are reproducible from the runbook alone.
3. Someone who has never seen the onboarding email can configure and test the integration from `docs/` alone.
4. No secret value anywhere in git history for this milestone.

## Risk Assessment
- **UAT needs a live tunnel** — T4/T6 are impossible without one. Do not mark them passed by inspection.
- **Certification turnaround is external** and may take days. Submitting late, not building slowly, is what delays go-live.

## Security Considerations
- Final grep for the API key across the working tree and the milestone's commits.
- Confirm `lib/windcave/*` and `lib/orders/create-order.ts` are `server-only` and absent from the client bundle (`npm run build` output).

## Next Steps
Milestone complete. See [`plans/backlog.md`](../backlog.md) for the deferred follow-ups this work surfaced — confirmation emails, staff order workflow, and delivery-address validation are the three that matter most once real money is flowing.
