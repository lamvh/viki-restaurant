# Phase 03 — Windcave API Client

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-online-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-online-payment-design.md) (§5.1 flow, §7 modules)
- Windcave REST reference: https://www.windcave.com/developer-e-commerce-api-rest
- Depends on: 01
- Unblocks: 04

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Pure library code wrapping Windcave's two REST calls — `POST /sessions` and `GET /sessions/{id}`. Typed, timed out, with structured errors. No UI, no database, no Next.js. Fully unit-testable against a mocked `fetch`.

## Key Insights
- Auth is HTTP Basic: `Authorization: Basic base64(username:apiKey)`. `windcaveEnv().authHeader` from Phase 01 pre-builds it.
- **`amount` is a string, not a number** — `"12.50"`, always two decimals. Sending a JS number is a common integration bug.
- `POST /sessions` returns **`202 Accepted`**, not `200`. Treat any 2xx as success rather than equality-checking `200`.
- The `links` array must be **stored and passed through intact, never reconstructed**. Windcave explicitly recommends this, and it is what makes a later Drop-In swap frontend-only.
- Session `state` is `init` → `pending` → `complete`. Do not infer payment success from `state` alone — `complete` only means the session finished, not that it was authorised. Authorisation lives in `transactions[0].authorised`.
- Network failure and a declined card are completely different outcomes. The client raises on the former and returns data on the latter; conflating them causes retry loops on legitimately declined cards.

## Requirements
**Functional**
- `createSession(input)` posts a session and returns the parsed response including `id`, `state`, `links`.
- `querySession(sessionId)` fetches current session state including `transactions[]`.
- `hppUrl(session)` extracts `links[rel="hpp"].href`, or throws a clear error if absent.
- Non-2xx responses raise `WindcaveError` carrying status and body.
- Both calls time out at 10s.

**Non-functional**
- `server-only`; never bundled to the client.
- Zero test-suite network access — all tests use a mocked `fetch`.
- No secrets in log output.

## Architecture
- `lib/windcave/types.ts` — request/response shapes, no logic.
- `lib/windcave/client.ts` — transport only. No business rules, no DB, no order concepts. Callers own interpretation.

## Related Code Files
**Create**
- `lib/windcave/types.ts`
- `lib/windcave/client.ts`
- `lib/windcave/client.test.ts`

**Modify:** none · **Delete:** none

## Implementation Steps

1. Write `lib/windcave/types.ts`:

```ts
export type WindcaveLink = {
  href: string;
  rel: string;
  method: string;
};

export type WindcaveCard = {
  cardHolderName?: string;
  cardNumber?: string;
  type?: string;
};

export type WindcaveTransaction = {
  id?: string;
  authorised?: boolean;
  responseText?: string;
  reCo?: string;
  authCode?: string;
  amount?: string;
  currency?: string;
  card?: WindcaveCard;
  liabilityIndicator?: string;
};

export type WindcaveSession = {
  id: string;
  state?: string;
  type?: string;
  amount?: string;
  currency?: string;
  merchantReference?: string;
  links?: WindcaveLink[];
  transactions?: WindcaveTransaction[];
};

export type CreateSessionInput = {
  /** Two-decimal string, e.g. "12.50". Never a number. */
  amount: string;
  currency: string;
  merchantReference: string;
  callbackUrls: { approved: string; declined: string; cancelled: string };
  notificationUrl: string;
  customer?: { email?: string; phoneNumber?: string };
};
```

2. Write `lib/windcave/client.ts`:

```ts
import 'server-only';

import { windcaveEnv } from './env';
import type { CreateSessionInput, WindcaveSession } from './types';

const TIMEOUT_MS = 10_000;

export class WindcaveError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'WindcaveError';
  }
}

/** Money as Windcave expects it: a two-decimal string, never a JS number. */
export function formatAmount(value: number): string {
  return value.toFixed(2);
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const env = windcaveEnv();

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: env.authHeader,
        ...init.headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (cause) {
    // Transport failure — distinct from a declined card, and safe to retry.
    throw new WindcaveError(`Windcave request failed: ${String(cause)}`);
  }

  const text = await response.text();

  // Create returns 202, query returns 200 — accept any 2xx.
  if (!response.ok) {
    throw new WindcaveError('Windcave returned an error', response.status, text);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new WindcaveError('Windcave returned malformed JSON', response.status, text);
  }
}

export async function createSession(input: CreateSessionInput): Promise<WindcaveSession> {
  return request<WindcaveSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ type: 'purchase', methods: ['card'], ...input }),
  });
}

export async function querySession(sessionId: string): Promise<WindcaveSession> {
  return request<WindcaveSession>(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
  });
}

/** The hosted-payment-page redirect target. */
export function hppUrl(session: WindcaveSession): string {
  const link = session.links?.find((l) => l.rel === 'hpp');
  if (!link?.href) {
    throw new WindcaveError('Windcave session returned no hpp link');
  }
  return link.href;
}
```

3. Write `lib/windcave/client.test.ts` with `vi.stubGlobal('fetch', ...)` and Windcave env stubbed via `vi.stubEnv`. Cover:
   - `formatAmount(12.5)` → `'12.50'`; `formatAmount(12)` → `'12.00'`.
   - `createSession` sends `Authorization: Basic <base64>` matching `username:apiKey`.
   - `createSession` sends `type: 'purchase'` and the amount as a **string**.
   - A `202` response parses successfully (guards against an accidental `=== 200` check).
   - A `401` raises `WindcaveError` with `status === 401`.
   - A network rejection raises `WindcaveError` whose message marks it a transport failure.
   - Malformed JSON raises rather than returning `undefined`.
   - `hppUrl` picks `rel === 'hpp'` out of a multi-link array and ignores `self` / `submitCard`.
   - `hppUrl` throws when no hpp link is present.
   - `querySession` URL-encodes the session id.

4. Run `npm test lib/windcave` — all green, and confirm no real network call occurs (unstub `fetch` and verify the suite fails loudly rather than silently hitting UAT).

5. `npm run lint` and `npm run build`.

## Todo List
- [ ] `lib/windcave/types.ts`
- [ ] `lib/windcave/client.ts` with 10s timeout + `WindcaveError`
- [ ] `formatAmount` two-decimal string
- [ ] `hppUrl` link extraction
- [ ] `client.test.ts` covering all ten cases above
- [ ] `npm test` / `lint` / `build` green

## Success Criteria
1. Every test passes with no network access.
2. A `202` is treated as success.
3. Transport failure and HTTP error are distinguishable by the caller.
4. Amount is always a two-decimal string on the wire.

## Risk Assessment
- **`AbortSignal.timeout`** needs Node 18+; the repo pins Node 20+ in `.nvmrc` and `engines`, so it is available.
- **Field-name drift** — if UAT returns shapes differing from the documented ones, the optional types absorb it without a crash; log the raw body to `payment_events` in Phase 05 to diagnose.

## Security Considerations
- `WindcaveError.body` may contain gateway detail — log it server-side only, never render it to the customer.
- Never log `env.apiKey` or `env.authHeader`.

## Next Steps
Phase 04 composes this client with `createOrder` from Phase 02.
