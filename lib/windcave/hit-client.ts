import 'server-only';

// Transport for the Windcave HIT terminal. Envelope construction and parsing
// live in ./hit-xml so they stay pure and testable; this module only speaks HTTP.

import { hitEnv } from './hit-env';
import { buildScrRequest, parseScrResponse } from './hit-xml';
import type { HitButtonValue, HitStatus, PurchaseInput } from './hit-types';

/** Terminals are slower than web APIs — a card prompt can sit for a while. */
const TIMEOUT_MS = 15_000;

export class HitError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'HitError';
  }
}

async function post(fields: Record<string, string | undefined>): Promise<HitStatus> {
  const env = hitEnv();
  const xml = buildScrRequest({ user: env.user, key: env.key, station: env.station }, fields);

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
    // Transport failure is not a decline. Callers may retry this; they must not
    // retry a declined card. Note the request body is deliberately not attached
    // to the error — it carries the API key.
    throw new HitError(`Terminal request failed: ${(cause as Error)?.message ?? 'network error'}`);
  }

  const text = await response.text();

  if (!response.ok) {
    throw new HitError('Terminal returned an error', response.status, text);
  }

  try {
    // `raw` is carried for diagnostics: a wrong envelope parses to a shape full
    // of undefined, and only the unparsed body reveals why.
    return { ...parseScrResponse(text), raw: text };
  } catch {
    throw new HitError('Terminal returned malformed XML', response.status, text);
  }
}

/** Starts a sale on the terminal. `txnRef` must be unique per attempt. */
export async function startPurchase(input: PurchaseInput): Promise<HitStatus> {
  const env = hitEnv();

  return post({
    TxnType: 'Purchase',
    TxnRef: input.txnRef,
    Amount: input.amount,
    Cur: input.currency,
    DeviceId: env.deviceId,
    PosName: env.posName,
    MRef: input.merchantReference,
  });
}

/** Polls an in-flight transaction. Poll until `complete` is true. */
export async function pollStatus(txnRef: string): Promise<HitStatus> {
  return post({ TxnType: 'Status', TxnRef: txnRef });
}

/**
 * Relays a soft-button press. This is a distinct `UI` transaction, not a field
 * on the Status request — pressing a button and polling are separate calls.
 */
export async function sendButton(
  txnRef: string,
  name: 'B1' | 'B2',
  value: HitButtonValue,
): Promise<HitStatus> {
  return post({
    TxnType: 'UI',
    UiType: 'Bn',
    Name: name,
    Val: value,
    TxnRef: txnRef,
  });
}

export { formatHitAmount, centsMatch } from './hit-xml';
