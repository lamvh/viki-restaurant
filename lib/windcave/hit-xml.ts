// HIT XML envelope: build requests, parse responses. Pure — no network, no env.
//
// Envelope verified against the PXHIT specification, v2.3:
//   Request:  <Scr action="doScrHIT" user="…" key="…"> with fields as children.
//             `user` and `key` are ATTRIBUTES on the root, not child elements.
//   Response: <Scr> with Complete / DL1 / DL2 / B1 / B2 and, once finished, a
//             <Result> block using two-letter field codes.
//   Buttons:  B1/B2 carry an `en` attribute (enabled) with the label as text.
//             A press is relayed as a separate TxnType=UI request, not as a
//             field on Status.
//   Amounts:  requests use D.CC strings; Result AmtA/AmtS/AmtT are in CENTS.

import { XMLBuilder, XMLParser } from 'fast-xml-parser';

import type { HitButton, HitResult, HitStatus } from './hit-types';

const ATTR = '@_';
const TEXT = '#text';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ATTR,
  textNodeName: TEXT,
  // Keep everything a string: "0" must never coerce to a falsy number.
  parseTagValue: false,
  parseAttributeValue: false,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: ATTR,
  textNodeName: TEXT,
  suppressEmptyNode: true,
});

/** Credentials, supplied by the caller so this module stays pure. */
export type ScrAuth = {
  user: string;
  key: string;
};

type ScrNode = Record<string, unknown>;

/** An element may parse as a string, or as an object when it has attributes. */
function asText(node: unknown): string | undefined {
  if (node === undefined || node === null) return undefined;
  if (typeof node === 'string') return node === '' ? undefined : node;
  if (typeof node === 'object') {
    const text = (node as ScrNode)[TEXT];
    return typeof text === 'string' && text !== '' ? text : undefined;
  }
  return undefined;
}

/** `<B1 en="0"/>` → disabled; `<B2 en="1">CANCEL</B2>` → enabled with a label. */
function asButton(node: unknown): HitButton | undefined {
  if (node === undefined || node === null) return undefined;
  const enabled =
    typeof node === 'object' ? (node as ScrNode)[`${ATTR}en`] === '1' : false;
  return { enabled, label: asText(node) ?? '' };
}

/** Result amounts arrive as integer cents, not D.CC strings. */
function asCents(node: unknown): number | undefined {
  const text = asText(node);
  if (text === undefined) return undefined;
  const cents = Number.parseInt(text, 10);
  return Number.isFinite(cents) ? cents : undefined;
}

function parseResult(node: unknown): HitResult | undefined {
  if (node === undefined || node === null || typeof node !== 'object') return undefined;
  const r = node as ScrNode;

  return {
    // AP is the only field that decides success: "1" approved, "0" declined.
    authorised: asText(r.AP) === '1',
    authCode: asText(r.AC),
    responseCode: asText(r.RC),
    responseText: asText(r.RT),
    transactionId: asText(r.TR),
    cardNumber: asText(r.CN),
    cardType: asText(r.CT),
    cardHolder: asText(r.CH),
    amountCents: asCents(r.AmtA),
    surchargeCents: asCents(r.AmtS),
    tipCents: asCents(r.AmtT),
    cashOutCents: asCents(r.AmtC),
  };
}

/** Parses a HIT response envelope. Throws if the payload is not a `<Scr>` document. */
export function parseScrResponse(xml: string): HitStatus {
  const doc = parser.parse(xml) as ScrNode;
  const scr = doc.Scr as ScrNode | undefined;

  if (!scr || typeof scr !== 'object') {
    throw new Error('HIT response contained no <Scr> element');
  }

  // Envelope-level rejection uses a different shape entirely:
  //   <Scr><Response Code="XX">Missing tag …</Response>
  //        <TransactionIsComplete>1</TransactionIsComplete></Scr>
  // No Complete, no ReCo, no Result — so it must be read separately or the
  // reason is silently lost.
  const response = scr.Response;
  const errorMessage = asText(response);
  const errorCode =
    response && typeof response === 'object'
      ? ((response as ScrNode)[`${ATTR}Code`] as string | undefined)
      : undefined;

  return {
    complete:
      asText(scr.Complete) === '1' || asText(scr.TransactionIsComplete) === '1',
    errorCode,
    errorMessage,
    statusId: asText(scr.StatusId),
    txnStatusId: asText(scr.TxnStatusId),
    txnRef: asText(scr.TxnRef),
    reCo: asText(scr.ReCo),
    timeoutSeconds: asText(scr.Tmo),
    dl1: asText(scr.DL1),
    dl2: asText(scr.DL2),
    b1: asButton(scr.B1),
    b2: asButton(scr.B2),
    receipt: asText(scr.Rcpt),
    result: parseResult(scr.Result),
  };
}

/**
 * Builds a `<Scr action="doScrHIT">` request. `user`/`key` become root attributes.
 *
 * **Element order is preserved from `fields` and matters.** The service validates
 * against a sequence, so callers pass fields in the order the specification lists
 * them rather than relying on this function to arrange them.
 */
export function buildScrRequest(
  auth: ScrAuth,
  fields: Record<string, string | undefined>,
): string {
  const children: Record<string, string> = {};
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined) children[name] = value;
  }

  return builder.build({
    Scr: {
      [`${ATTR}action`]: 'doScrHIT',
      [`${ATTR}user`]: auth.user,
      [`${ATTR}key`]: auth.key,
      ...children,
    },
  }) as string;
}

/** Strips credentials so a request can be logged or shown on screen. */
export function redactScrRequest(xml: string): string {
  return xml.replace(/key="[^"]*"/g, 'key="***REDACTED***"');
}

/** Money as HIT expects it on a request: a two-decimal string, never a number. */
export function formatHitAmount(value: number): string {
  return value.toFixed(2);
}

/** Compares a D.CC order total against the Result's integer-cent amount. */
export function centsMatch(expectedAmount: number, actualCents: number): boolean {
  return Math.round(expectedAmount * 100) === actualCents;
}
