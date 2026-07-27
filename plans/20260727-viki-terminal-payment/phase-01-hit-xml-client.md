# Phase 01 — HIT XML Client

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-terminal-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-terminal-payment-design.md) (§5.1 flow, §7 modules)
- **Protocol spec: https://www.windcave.com/Document/PXHIT.pdf** — the authority for wire format
- Depends on: none
- Unblocks: 02

## Overview
- **Priority:** P1
- **Status:** ✅ done
- **Description:** Pure library code wrapping the HIT protocol: build the request XML, POST it to `/hit/pos.aspx`, parse the response into typed objects. No UI, no database, no hardware required — the terminal is already on hand, so this phase is the only thing standing between here and a live test sale.

## ⚠️ Read the PDF before writing the builder

**The exact XML element names and nesting below are inferred from Windcave's
public documentation summaries, not from the spec PDF itself.** Field *names*
(`TxnType`, `TxnRef`, `Station`, `Amount`, `Cur`, `DeviceId`, `PosName`, `DL1`,
`DL2`, `B1`, `B2`, `Complete`, `ReCo`) are documented; the **exact envelope
structure is not verified**.

**Step 1 of this phase is to open [PXHIT.pdf](https://www.windcave.com/Document/PXHIT.pdf) and confirm the envelope**,
then correct the builder before implementing anything else. Do not treat the
sample below as authoritative. Getting this wrong produces silent parse failures
against a live card terminal.

The Postman collection and Windcave dev support (`devsupport@windcave.com`, quote
Customer ID `144852`) are the fallbacks if the PDF is ambiguous.

## Key Insights
- HIT is **XML over HTTPS POST**, not JSON. Node has no built-in XML parser — hence the `fast-xml-parser` dependency.
- **Two request types matter:** `Purchase` starts a sale, `Status` polls it. Both carry the same `TxnRef`.
- **`Complete` is the loop terminator**, not `ReCo`. `Complete=0` means keep polling; `Complete=1` means the terminal is done and `Result` is populated.
- `DL1`/`DL2` are **the terminal's own display text** — render them verbatim rather than inventing our own prompts. They stay in sync with what the cardholder sees.
- `B1`/`B2` are soft-button labels the terminal offers *the staff member*. When present, show them as buttons; pressing one sends the choice back on the next request.
- **`Amount` is `D.CC` format** — a string, two decimals, same discipline as the online channel.
- Transport failure and a declined card are different outcomes. The client raises on the former and returns data on the latter.

## Requirements
**Functional**
- `startPurchase({ txnRef, amount, ... })` posts a Purchase and returns the parsed first status.
- `pollStatus({ txnRef, button? })` posts a Status and returns the parsed current state.
- Responses parse into a typed object exposing `complete`, `statusId`, `dl1`, `dl2`, `b1`, `b2`, and `result`.
- Non-2xx or unparseable responses raise `HitError`.
- 15s timeout per request (terminals are slower than web APIs).

**Non-functional**
- `server-only`; the key never reaches a browser.
- Zero network access in tests.
- The key never appears in log output.

## Related Code Files
**Create**
- `lib/windcave/hit-env.ts`
- `lib/windcave/hit-types.ts`
- `lib/windcave/hit-client.ts`
- `lib/windcave/hit-client.test.ts`

**Modify**
- `package.json` (add `fast-xml-parser`)
- `.env.example` (append the HIT block)

**Delete:** none

## Implementation Steps

1. **Open [PXHIT.pdf](https://www.windcave.com/Document/PXHIT.pdf) and confirm the request envelope, response envelope, and the `Result` block field names.** Correct steps 4–5 below to match. Record the confirmed shape as a comment at the top of `hit-client.ts` with the spec version number so the next reader knows what it was built against.

2. `npm i fast-xml-parser`.

3. Append to `.env.example` — **empty secret**:

```
# Windcave HIT terminal (card present) — see docs/windcave-integration.md
WINDCAVE_HIT_URL=https://uat.windcave.com/hit/pos.aspx
WINDCAVE_HIT_USER=VinapageUAT_HIT
# Server-only. ROTATE in Payline before first use. Never commit.
WINDCAVE_HIT_KEY=
WINDCAVE_HIT_STATION=3425240086
WINDCAVE_HIT_POS_NAME=Viki
```

4. Write `lib/windcave/hit-env.ts`, mirroring `lib/windcave/env.ts` from Phase 01:

```ts
import 'server-only';

export type HitEnv = {
  url: string;
  user: string;
  key: string;
  station: string;
  posName: string;
  deviceId: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Terminal payment is not configured — see docs/windcave-integration.md.`);
  }
  return value;
}

/** Validated HIT config. Called at request time, never at module load. */
export function hitEnv(): HitEnv {
  return Object.freeze({
    url: process.env.WINDCAVE_HIT_URL ?? 'https://uat.windcave.com/hit/pos.aspx',
    user: required('WINDCAVE_HIT_USER'),
    key: required('WINDCAVE_HIT_KEY'),
    station: required('WINDCAVE_HIT_STATION'),
    posName: process.env.WINDCAVE_HIT_POS_NAME ?? 'Viki',
    deviceId: process.env.WINDCAVE_HIT_POS_NAME ?? 'Viki',
  });
}
```

5. Write `lib/windcave/hit-types.ts`:

```ts
export type HitResult = {
  authorised?: boolean;
  responseText?: string;
  reCo?: string;
  amount?: string;
  cardName?: string;
  txnRef?: string;
  receipt?: string;
};

export type HitStatus = {
  /** True once the terminal has finished. The polling loop terminator. */
  complete: boolean;
  statusId?: string;
  /** Terminal display lines — render verbatim, do not paraphrase. */
  dl1?: string;
  dl2?: string;
  /** Soft-button labels the terminal is offering. Render as buttons when present. */
  b1?: string;
  b2?: string;
  result?: HitResult;
};
```

6. Write `lib/windcave/hit-client.ts`. **Correct the envelope to match the PDF first.**

```ts
import 'server-only';

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { hitEnv } from './hit-env';
import type { HitStatus } from './hit-types';

const TIMEOUT_MS = 15_000; // Terminals are slower than web APIs.

export class HitError extends Error {
  constructor(message: string, readonly status?: number, readonly body?: string) {
    super(message);
    this.name = 'HitError';
  }
}

/** Terminal amounts are D.CC strings, never JS numbers. */
export function formatHitAmount(value: number): string {
  return value.toFixed(2);
}

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
const builder = new XMLBuilder({ ignoreAttributes: false });

type ScrFields = Record<string, string | undefined>;

// VERIFY against PXHIT.pdf before use — envelope shape is not yet confirmed.
function buildScr(fields: ScrFields): string {
  const env = hitEnv();
  return builder.build({
    Scr: {
      '@_action': 'doScrHIT',
      user: env.user,
      key: env.key,
      Station: env.station,
      PosName: env.posName,
      DeviceId: env.deviceId,
      ...fields,
    },
  });
}

async function post(xml: string): Promise<HitStatus> {
  const env = hitEnv();

  let response: Response;
  try {
    response = await fetch(env.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (cause) {
    // Transport failure — distinct from a declined card, and safe to retry.
    throw new HitError(`Terminal request failed: ${String(cause)}`);
  }

  const text = await response.text();
  if (!response.ok) throw new HitError('Terminal returned an error', response.status, text);

  return parseScr(text);
}

export function parseScr(xml: string): HitStatus {
  let doc: Record<string, ScrFields>;
  try {
    doc = parser.parse(xml) as Record<string, ScrFields>;
  } catch {
    throw new HitError('Terminal returned malformed XML', undefined, xml);
  }

  const scr = (doc.Scr ?? {}) as Record<string, unknown>;
  const result = scr.Result as Record<string, string> | undefined;

  return {
    complete: String(scr.Complete ?? '0') === '1',
    statusId: scr.TxnStatusId as string | undefined,
    dl1: scr.DL1 as string | undefined,
    dl2: scr.DL2 as string | undefined,
    b1: scr.B1 as string | undefined,
    b2: scr.B2 as string | undefined,
    result: result
      ? {
          authorised: String(result.Authorised ?? result.authorised ?? '') === '1',
          responseText: result.ResponseText,
          reCo: result.ReCo,
          amount: result.Amount,
          cardName: result.CardName,
          txnRef: result.TxnRef,
          receipt: result.Receipt,
        }
      : undefined,
  };
}

export async function startPurchase(input: {
  txnRef: string;
  amount: string;
  currency: string;
}): Promise<HitStatus> {
  return post(
    buildScr({
      TxnType: 'Purchase',
      TxnRef: input.txnRef,
      Amount: input.amount,
      Cur: input.currency,
    }),
  );
}

/** Polls an in-flight transaction. `button` relays a B1/B2 press back to the terminal. */
export async function pollStatus(input: {
  txnRef: string;
  button?: 'B1' | 'B2';
}): Promise<HitStatus> {
  return post(
    buildScr({
      TxnType: 'Status',
      TxnRef: input.txnRef,
      ...(input.button ? { Button: input.button } : {}),
    }),
  );
}
```

7. Write `lib/windcave/hit-client.test.ts` against mocked `fetch` and stubbed env. Cover:
   - `formatHitAmount(12.5)` → `'12.50'`.
   - A Purchase request body contains `TxnType`, the `TxnRef`, the station, and the amount as a string.
   - `parseScr` with `Complete=0` → `complete: false`, `dl1`/`dl2` extracted, no `result`.
   - `parseScr` with `Complete=1` and an authorised `Result` → `complete: true`, `result.authorised === true`.
   - `parseScr` with `Complete=1` and a declined `Result` → `result.authorised === false`.
   - `B1`/`B2` present → surfaced; absent → `undefined`.
   - `pollStatus` with a button includes it in the body; without one, omits it.
   - A `500` raises `HitError` with the status.
   - Malformed XML raises rather than returning a half-parsed object.
   - The HIT key never appears in a thrown error's message.

8. `npm test lib/windcave`, `npm run lint`, `npm run build`.

## Todo List
- [x] **PXHIT.pdf read; envelope confirmed and builder corrected**
- [x] Spec version (v2.3) recorded in a comment at the top of `hit-xml.ts`
- [x] `fast-xml-parser` installed (`^5.10.1`)
- [x] `.env.example` HIT block appended (empty key)
- [x] `hit-env.ts` / `hit-types.ts` / `hit-xml.ts` / `hit-client.ts` with `server-only`
- [x] `hit-xml.test.ts` (16) + `hit-client.test.ts` (10) — 26 tests
- [x] `test` / `lint` / `build` green

### Corrections the PDF forced — the reason this step existed

| Inferred (wrong) | Confirmed |
|---|---|
| `user` / `key` as child elements | **Root attributes** on `<Scr action="doScrHIT" user key>` |
| `B1`/`B2` are plain strings | Elements with an **`en`** enabled attribute; label is the text content |
| Button press is a field on Status | A **separate `TxnType=UI`** request (`UiType=Bn`, `Name`, `Val`) |
| Result has `Authorised`/`ResponseText` | **Two-letter codes**: `AP` (1/0), `AC`, `RC`, `RT`, `TR`, `CN`, `CT` |
| Result amount is a `D.CC` string | **`AmtA` is integer CENTS**; also `AmtT` (tip), `AmtS` (surcharge) |
| — | Status requests also carry `Station` |

Two extra deliverables beyond the original plan:

- **`lib/windcave/hit-xml.ts`** split out of the client — envelope build/parse is
  pure, so 16 of the 26 tests need no mocking at all.
- **`centsMatch(total, amountCents)`** — comparing a decimal total to integer
  cents naively fails on float error (`10.1 * 100` is `1009.999…`). Tested.

One config change: `vitest.config.ts` aliases `server-only` to a stub, since that
package throws on import outside an RSC and would make every server module
untestable. The real guard still applies at build time.

## Success Criteria
1. The XML envelope matches PXHIT.pdf, verified by a human reading the PDF.
2. All tests pass with no network access.
3. `Complete` drives the loop, not `ReCo`.
4. Transport failure and HTTP error are distinguishable by the caller.
5. The HIT key appears in no log line or error message.

## Risk Assessment
- **Inferred envelope is wrong** → this is the single largest risk in the milestone, and why step 1 is "read the PDF". Symptoms would be a `200` with an error payload, or an empty parse. Log the raw body to `payment_events` in Phase 05 to diagnose fast.
- **`fast-xml-parser` type coercion** — `parseTagValue: false` keeps everything a string, so `Complete` of `"0"` never becomes falsy-`0` confusion. Do not remove that option.
- **Temptation to skip straight to Phase 02** — the terminal is on hand and it is tempting to hack a request together. Resist: the typed client and its tests are what make the spike's failures diagnosable rather than mystifying.

## Security Considerations
- `server-only` guard means a stray client import fails the build.
- `HitError.body` may echo request context — log server-side only, never render it.
- Never log `hitEnv().key`; the test suite asserts this.

## Next Steps
Phase 05 gives staff a screen to start a charge from.
