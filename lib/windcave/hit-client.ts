import 'server-only';

// Transport for the Windcave HIT terminal. Envelope construction and parsing
// live in ./hit-xml so they stay pure and testable; this module only speaks HTTP.

import { hitEnv } from './hit-env';
import { buildScrRequest, parseScrResponse, redactScrRequest } from './hit-xml';
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
  const xml = buildScrRequest({ user: env.user, key: env.key }, fields);

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
    // `raw`/`rawRequest` are carried for diagnostics: a wrong envelope parses to
    // a shape full of undefined, and only the unparsed bodies reveal why. The
    // request is redacted — the API key rides on the root element.
    return { ...parseScrResponse(text), raw: text, rawRequest: redactScrRequest(xml) };
  } catch {
    throw new HitError('Terminal returned malformed XML', response.status, text);
  }
}

/**
 * Starts a sale on the terminal. `txnRef` must be unique per attempt.
 *
 * Field order below mirrors the specification's Purchase sample exactly — the
 * service validates against a sequence, so reordering these silently fails.
 */
export async function startPurchase(input: PurchaseInput): Promise<HitStatus> {
  const env = hitEnv();

  return post({
    Amount: input.amount,
    Cur: input.currency,
    TxnType: 'Purchase',
    Station: env.station,
    TxnRef: input.txnRef,
    DeviceId: env.deviceId,
    PosName: env.posName,
    PosVersion: env.posVersion,
    VendorId: env.vendorId,
    MRef: input.merchantReference,
  });
}

/** Polls an in-flight transaction. Poll until `complete` is true. */
export async function pollStatus(txnRef: string): Promise<HitStatus> {
  const env = hitEnv();

  return post({ Station: env.station, TxnType: 'Status', TxnRef: txnRef });
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
  const env = hitEnv();

  return post({
    Station: env.station,
    TxnType: 'UI',
    UiType: 'Bn',
    Name: name,
    Val: value,
    TxnRef: txnRef,
  });
}

/**
 * Retrieves the terminal's own EFTPOS receipt text for a past transaction.
 *
 * This only *fetches* text — HIT has no way to send arbitrary content to the
 * device's printer, so an itemised food bill cannot be printed there. Pass
 * `duplicate` to mark the copy as a reprint.
 */
export async function getReceipt(txnRef: string, duplicate = false): Promise<HitStatus> {
  const env = hitEnv();

  return post({
    Station: env.station,
    TxnType: 'Receipt',
    TxnRef: txnRef,
    DuplicateFlag: duplicate ? '1' : '0',
    ReceiptType: '2',
  });
}

export { formatHitAmount, centsMatch } from './hit-xml';
