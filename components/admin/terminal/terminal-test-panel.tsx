'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  pollTestPurchase,
  pressTestButton,
  startTestPurchase,
} from '@/app/admin/terminal-test/actions';
import type { SpikeResult } from '@/app/admin/terminal-test/spike-config';
import type { HitButtonValue, HitStatus } from '@/lib/windcave/hit-types';

const POLL_MS = 1000;
/** ~2 minutes. Past this the terminal has almost certainly gone quiet. */
const MAX_TICKS = 120;

type Phase = 'idle' | 'running' | 'complete' | 'error';

export function TerminalTestPanel({ amount }: { amount: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [txnRef, setTxnRef] = useState<string | null>(null);
  const [status, setStatus] = useState<HitStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticks, setTicks] = useState(0);

  // Guards against overlapping polls if one request outlives the interval.
  const inFlight = useRef(false);

  const apply = useCallback((result: SpikeResult) => {
    if (result.ok) {
      setStatus(result.status);
      setError(null);
      if (result.status.complete) setPhase('complete');
    } else {
      setError(result.error);
      setPhase('error');
    }
  }, []);

  async function start() {
    setPhase('running');
    setStatus(null);
    setError(null);
    setTicks(0);
    inFlight.current = false;

    const result = await startTestPurchase();
    if (result.ok) setTxnRef(result.txnRef);
    apply(result);
  }

  async function press(name: 'B1' | 'B2', value: HitButtonValue) {
    if (!txnRef) return;
    apply(await pressTestButton(txnRef, name, value));
  }

  useEffect(() => {
    if (phase !== 'running' || !txnRef) return;

    const id = setInterval(async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        setTicks((n) => n + 1);
        apply(await pollTestPurchase(txnRef));
      } finally {
        inFlight.current = false;
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [phase, txnRef, apply]);

  // Stop rather than poll a dead terminal forever.
  useEffect(() => {
    if (ticks >= MAX_TICKS && phase === 'running') {
      setPhase('error');
      setError(`Gave up after ${MAX_TICKS} polls — the terminal stopped responding.`);
    }
  }, [ticks, phase]);

  const result = status?.result;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={phase === 'running'}
          className="rounded-[var(--radius-btn)] bg-brand px-4 py-2.5 text-sm font-semibold text-surface disabled:opacity-50"
        >
          {phase === 'running' ? 'Sale in progress…' : `Start ${amount} test sale`}
        </button>
        {txnRef ? (
          <code className="text-xs text-ink/50">
            {txnRef} · {ticks} poll{ticks === 1 ? '' : 's'}
          </code>
        ) : null}
      </div>

      {/* The terminal's own words — rendered verbatim so this screen and the
          device never disagree about what the cardholder is being asked. */}
      {status ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface px-6 py-8 text-center">
          <p className="font-display text-3xl leading-tight">{status.dl1 ?? '—'}</p>
          {status.dl2 ? <p className="mt-1 text-lg text-ink/70">{status.dl2}</p> : null}

          <div className="mt-5 flex justify-center gap-3">
            {(['B1', 'B2'] as const).map((name) => {
              const button = name === 'B1' ? status.b1 : status.b2;
              if (!button?.enabled) return null;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => press(name, (button.label || 'YES') as HitButtonValue)}
                  className="rounded-[var(--radius-btn)] border border-line px-4 py-2 text-sm font-medium"
                >
                  {button.label || name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {result ? (
        <div
          className={`rounded-[var(--radius-card)] border px-5 py-4 ${
            result.authorised ? 'border-brand' : 'border-line'
          }`}
        >
          <p className="font-display text-2xl">
            {result.authorised ? 'Approved' : 'Declined'}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <Row label="Response" value={result.responseText} />
            <Row label="Auth code" value={result.authCode} />
            <Row label="Card" value={result.cardNumber} />
            <Row label="Type" value={result.cardType} />
            <Row label="Windcave txn" value={result.transactionId} />
            <Row
              label="Amount"
              value={result.amountCents !== undefined ? `${result.amountCents}c` : undefined}
            />
            <Row
              label="Tip"
              value={result.tipCents !== undefined ? `${result.tipCents}c` : undefined}
            />
          </dl>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[var(--radius-card)] border border-brand bg-surface px-5 py-4">
          <p className="text-sm font-semibold">Error</p>
          {/* Verbatim — a prettified error hides the cause it exists to reveal. */}
          <pre className="mt-2 overflow-x-auto text-xs whitespace-pre-wrap">{error}</pre>
        </div>
      ) : null}

      {status ? (
        <div className="flex flex-col gap-3">
          {/* Raw first: when the envelope is wrong the parsed view is all
              undefined, and only this shows why. */}
          <details className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4">
            <summary className="cursor-pointer text-sm font-semibold">Raw response XML</summary>
            <pre className="mt-3 overflow-x-auto text-xs whitespace-pre-wrap">
              {status.raw ?? '(none)'}
            </pre>
          </details>

          <details className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4">
            <summary className="cursor-pointer text-sm font-semibold">Parsed response</summary>
            <pre className="mt-3 overflow-x-auto text-xs">
              {JSON.stringify({ ...status, raw: undefined }, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
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
