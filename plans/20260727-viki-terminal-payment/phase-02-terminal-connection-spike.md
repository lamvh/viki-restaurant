# Phase 02 — Terminal Connection Spike

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-terminal-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-terminal-payment-design.md) (§5.1 flow)
- Account reference: [`docs/windcave-integration.md`](../../docs/windcave-integration.md)
- Depends on: 01
- Unblocks: 03

## Overview
- **Priority:** P0 — **this is the milestone's first real goal**
- **Status:** pending
- **Description:** Prove the whole HIT round-trip against the physical terminal, with **no orders, no database, no checkout involved**. One admin-only screen charges a fixed amount, polls, and shows every raw response. The point is to confirm the API works and the terminal answers before any flow is built on top of it.

## Why this comes before the order path

Everything after this phase — schema, order creation, staff screens — assumes the
HIT integration works. If the envelope is wrong, the credentials are stale, the
station id is mismatched, or the terminal is not reachable from our network,
finding out **now** costs an afternoon. Finding out after Phase 07 means unwinding
assumptions baked through five phases.

This is a throwaway-grade surface deliberately: it exists to answer *"does the
API work"*, and it gets replaced by the real flow in Phases 06–07. Do **not**
invest in its design.

## Key Insights
- **A fixed amount, hardcoded.** No order, no cart, no total. `1.00` NZD.
- **Show the raw XML both ways.** The whole value of a spike is visibility — when something is wrong, the parsed object hides the reason and the raw body shows it.
- `TxnRef` still has to be unique per attempt, or the second test returns the first test's result and looks like a bug in the terminal. Use a timestamp-based ref here — orders do not exist yet to derive one from.
- **This is the phase where credentials get proven.** If `WINDCAVE_HIT_KEY` was not rotated after the email leak, or was pasted wrong, this is where it surfaces as a 401-equivalent rather than three phases later.
- Admin-gated even though it is throwaway. An unauthenticated endpoint that drives a card terminal is not acceptable at any stage, including a spike.

## Requirements
**Functional**
- `/admin/terminal-test` starts a `1.00` purchase on the configured station.
- The page polls until `Complete=1`, rendering `DL1`/`DL2` and any `B1`/`B2`.
- Raw request and response XML are visible on screen.
- The final `Result` block is displayed in full.
- Errors (unreachable, auth failure, malformed) are shown verbatim, not swallowed.

**Non-functional**
- Staff-guarded on both the page and every endpoint.
- No database writes. No `orders` involvement whatsoever.
- Removed or replaced in Phase 07 — tracked, not left to rot.

## Architecture
- `app/admin/terminal-test/page.tsx` — the screen.
- `app/admin/terminal-test/actions.ts` — start + poll, both `requireStaff()`.
- Reuses `lib/windcave/hit-client.ts` from Phase 01 unchanged. If the spike needs the client changed, that is a **Phase 01 finding** — fix it there, not here.

## Related Code Files
**Create**
- `app/admin/terminal-test/page.tsx`
- `app/admin/terminal-test/actions.ts`
- `components/admin/terminal/terminal-test-panel.tsx`

**Modify**
- `lib/windcave/hit-client.ts` (only if the spike proves the envelope wrong)
- `components/admin/layout/*` (temporary nav link)

**Delete:** none — Phase 07 removes this surface

## Implementation Steps

0. **Terminal pre-flight — the device is on hand, so do this first.** None of it is app work, and all of it causes confusing app-side symptoms when skipped:

   - **Inspect the seal.** Windcave inspects and seals units before packaging. If the seal is broken or missing, **call Windcave Support before powering it on** — do not proceed with a possibly-tampered device.
   - **Confirm the serial reads `3425240086`** and matches `WINDCAVE_HIT_STATION`. A station mismatch looks exactly like a broken integration.
   - **Power it on and get it on the network.** The device reaches Windcave over **TCP port 65** (`uatscr.windcave.com` for UAT). If that port is blocked, the terminal never comes online and no amount of app-side work helps.
   - **Confirm it shows itself as connected/idle** before writing a line of spike code. This is the single cheapest way to avoid debugging the wrong layer.
   - Note anything unexpected — it goes into `docs/windcave-integration.md` at step 7.

1. Confirm `.env.local` carries a **rotated** `WINDCAVE_HIT_KEY`, plus `WINDCAVE_HIT_USER`, `WINDCAVE_HIT_STATION=3425240086`, and `WINDCAVE_HIT_URL` pointing at UAT.

2. Write `app/admin/terminal-test/actions.ts`:

```ts
'use server';

import { requireStaff } from '@/lib/auth/require-role';
import { startPurchase, pollStatus, formatHitAmount } from '@/lib/windcave/hit-client';
import type { HitStatus } from '@/lib/windcave/hit-types';

export type SpikeResult = { ok: true; txnRef: string; status: HitStatus } | { ok: false; error: string };

/** Fixed-amount test purchase. No order, no database — this proves the link only. */
export async function startTestPurchase(): Promise<SpikeResult> {
  await requireStaff();

  // Unique per attempt, or the next test replays this one's result.
  const txnRef = `TEST-${Date.now()}`;

  try {
    const status = await startPurchase({
      amount: formatHitAmount(1),
      currency: 'NZD',
      txnRef,
    });
    return { ok: true, txnRef, status };
  } catch (cause) {
    return { ok: false, error: String(cause) };
  }
}

export async function pollTestPurchase(txnRef: string): Promise<SpikeResult> {
  await requireStaff();

  try {
    const status = await pollStatus(txnRef);
    return { ok: true, txnRef, status };
  } catch (cause) {
    return { ok: false, error: String(cause) };
  }
}

/**
 * A soft-button press is a SEPARATE UI transaction, not a field on Status —
 * confirmed against PXHIT v2.3 in Phase 01. Press, then resume polling.
 */
export async function pressTestButton(
  txnRef: string,
  name: 'B1' | 'B2',
  value: HitButtonValue,
): Promise<SpikeResult> {
  await requireStaff();

  try {
    const status = await sendButton(txnRef, name, value);
    return { ok: true, txnRef, status };
  } catch (cause) {
    return { ok: false, error: String(cause) };
  }
}
```

Import from the Phase 01 client:
`import { startPurchase, pollStatus, sendButton, formatHitAmount } from '@/lib/windcave/hit-client';`
and `import type { HitButtonValue, HitStatus } from '@/lib/windcave/hit-types';`

3. Write `components/admin/terminal-test-panel.tsx` as a client component:
   - A **Start $1.00 test sale** button calling `startTestPurchase`.
   - Once started, poll `pollTestPurchase` every **1000ms** with an in-flight guard so ticks cannot stack; clear the interval on unmount.
   - Render `dl1`/`dl2` large and verbatim; render `b1`/`b2` as buttons that re-poll with the button set.
   - Stop on `complete`, then dump the whole `HitStatus` as formatted JSON.
   - Show any `error` string in full — do not prettify it.

4. Write `app/admin/terminal-test/page.tsx` as a server component that calls `requireStaff()` and renders the panel. Add a temporary nav link.

5. **Run the spike against the physical terminal** and record what happens for each:

   | Check | What proves it |
   |---|---|
   | Credentials valid | The start request returns a parsed status rather than an auth error |
   | Envelope correct | The response parses; `DL1`/`DL2` are populated, not `undefined` |
   | Station reachable | The physical terminal wakes and prompts for a card |
   | Polling works | `DL1`/`DL2` change on screen in step with the device |
   | Buttons work | A `B1`/`B2` press on screen changes the terminal's state |
   | Completion works | `Complete` flips to `1` and `Result` is populated |
   | Approval works | A test card approval yields `result.authorised === true` |
   | Decline works | A declined card yields `authorised === false` with a reason |

6. **If the envelope is wrong**, correct `lib/windcave/hit-client.ts` (Phase 01's deliverable) against PXHIT.pdf and re-run. Record the corrected shape in the Phase 01 comment block so it is not rediscovered later.

7. Record the outcome in `docs/windcave-integration.md` — confirmed envelope, confirmed station behaviour, and anything surprising. This is the phase that turns inference into fact.

8. `npm run lint`, `npm run build`.

## Todo List
- [ ] **Seal inspected; serial matches `3425240086`**
- [ ] **Terminal powered on, network-reachable (TCP 65), showing connected/idle**
- [ ] Rotated `WINDCAVE_HIT_KEY` in `.env.local`
- [x] `actions.ts` — `requireStaff()` on all three actions (start / poll / press)
- [x] Test panel with 1s polling, in-flight guard, 120-tick cap, raw output
- [x] `/admin/terminal-test` page, staff-guarded, temporary nav link
- [ ] **Physical terminal wakes and prompts**
- [ ] All eight checks in step 5 recorded
- [x] Envelope corrected in Phase 01 against PXHIT v2.3 — awaiting live re-verification
- [ ] Findings written into `docs/windcave-integration.md`
- [x] `lint` / `build` / `tsc` / 72 tests green

## Success Criteria

**The one that matters: a `$1.00` test sale runs end to end on the physical
terminal from `/admin/terminal-test`, and the screen shows the approval.**

Supporting:
1. Credentials authenticate.
2. The XML envelope is confirmed correct against the real service.
3. Polling reflects the device's state in near-real-time.
4. A decline is distinguishable from an error.
5. Nothing touches the database.

## Risk Assessment
- **Envelope wrong** → the most likely failure, and exactly what this phase exists to catch. Raw-XML display is what makes it diagnosable in minutes.
- **Seal broken on the received unit** → stop. Do not power it on; call Windcave Support. Covered by step 0.
- **Network path to the terminal** — the device talks to Windcave over TCP on port 65 (`uatscr.windcave.com`). If the restaurant's network blocks it, the terminal never comes online and no amount of app-side work helps. This is the most likely non-code failure now that the hardware is on hand — confirm connectivity at step 0 rather than debugging the app.
- **Station id mismatch** between the physical unit and `WINDCAVE_HIT_STATION` presents identically to a broken integration. Checked at step 0.
- **Stale credentials** — if the key was not rotated after the email exposure, rotate now; do not "just test with the leaked one first".

## Security Considerations
- Staff-guarded despite being throwaway. A card terminal is not a toy endpoint.
- Raw XML on screen may include the request envelope — **redact the key** before rendering, or build the display from the fields rather than echoing the outbound body.
- **This surface is removed in Phase 07.** A permanently-mounted "charge the terminal arbitrarily" page is not something to leave in an admin panel.

## Next Steps
With the link proven, Phase 03 starts the real flow: the schema the order path needs.
