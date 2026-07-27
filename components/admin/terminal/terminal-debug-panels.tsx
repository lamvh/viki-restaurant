'use client';

import type { HitResult, HitStatus } from '@/lib/windcave/hit-types';

/** Raw request/response dumps. Split out to keep the control panel readable. */
export function TerminalDebugPanels({
  purchase,
  latest,
}: {
  purchase: HitStatus | null;
  latest: HitStatus | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      {purchase ? (
        <>
          {/* Credentials are redacted in the client before this ever renders. */}
          <Dump open title="Request sent (raw XML)" body={purchase.rawRequest} />
          {/* When a sale never starts, this reply holds the reason — every later
              poll just reports "TxnRef not matched". */}
          <Dump open title="Purchase reply (raw XML)" body={purchase.raw} />
        </>
      ) : null}

      {latest ? (
        <>
          <Dump title="Latest poll (raw XML)" body={latest.raw} />
          <Dump
            title="Parsed response"
            body={JSON.stringify({ ...latest, raw: undefined, rawRequest: undefined }, null, 2)}
          />
        </>
      ) : null}
    </div>
  );
}

function Dump({ title, body, open }: { title: string; body?: string; open?: boolean }) {
  return (
    <details open={open} className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      <pre className="mt-3 overflow-x-auto text-xs whitespace-pre-wrap">{body ?? '(none)'}</pre>
    </details>
  );
}

/** Final outcome of a completed sale. */
export function TerminalResultCard({ result }: { result: HitResult }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border px-5 py-4 ${
        result.authorised ? 'border-brand' : 'border-line'
      }`}
    >
      <p className="font-display text-2xl">{result.authorised ? 'Approved' : 'Declined'}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <Row label="Response" value={result.responseText} />
        <Row label="Auth code" value={result.authCode} />
        <Row label="Card" value={result.cardNumber} />
        <Row label="Type" value={result.cardType} />
        <Row label="Windcave txn" value={result.transactionId} />
        <Row label="Amount" value={cents(result.amountCents)} />
        <Row label="Surcharge" value={cents(result.surchargeCents)} />
        {/* Expected to be zero — tipping is off for this MID. A non-zero value
            here means it was switched on, and real sales would then trip the
            amount-mismatch guard. */}
        <Row label="Tip" value={cents(result.tipCents)} />
      </dl>
    </div>
  );
}

function cents(value?: number): string | undefined {
  return value === undefined ? undefined : `${(value / 100).toFixed(2)}`;
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-ink/50">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}
