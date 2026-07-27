'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { TerminalDisplay, TerminalRejection } from '@/components/admin/terminal/terminal-display';
import type { PollOutcome } from '@/lib/orders/terminal-payment';
import type { HitButtonValue } from '@/lib/windcave/hit-types';

const POLL_MS = 1000;
/** ~2 minutes. Past this the terminal has almost certainly gone quiet. */
const MAX_TICKS = 120;

type Props = {
  orderId: string;
  reference: string;
  onClose: () => void;
  onRetry: () => void;
  onSettleCash: () => void;
};

export function TerminalPaymentDialog({
  orderId,
  reference,
  onClose,
  onRetry,
  onSettleCash,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<PollOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticks, setTicks] = useState(0);

  // Guards against overlapping polls if one request outlives the interval.
  const inFlight = useRef(false);
  const settled = status?.settled;
  const done = Boolean(settled);

  const call = useCallback(
    async (query: string) => {
      const res = await fetch(`/api/admin/terminal/status?orderId=${orderId}${query}`, {
        cache: 'no-store',
      });

      if (res.status === 401) {
        setError('Your session expired. Sign in again — the sale is still on the terminal.');
        return;
      }
      if (!res.ok) {
        setError('The terminal is not responding.');
        return;
      }

      setError(null);
      setStatus((await res.json()) as PollOutcome);
    },
    [orderId],
  );

  useEffect(() => {
    if (done) return;

    const id = setInterval(async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        setTicks((n) => n + 1);
        await call('');
      } finally {
        inFlight.current = false;
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [done, call]);

  // Stop rather than poll a dead terminal for ever.
  useEffect(() => {
    if (ticks >= MAX_TICKS && !done) {
      setError(`No response after ${MAX_TICKS} checks. Reopen this order to resume.`);
    }
  }, [ticks, done]);

  // Refresh the list once the outcome is known, so the row reflects it.
  useEffect(() => {
    if (done) router.refresh();
  }, [done, router]);

  function press(name: 'B1' | 'B2', value: HitButtonValue) {
    void call(`&button=${name}&value=${value}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-surface-alt p-6">
        <p className="text-xs uppercase tracking-wide text-ink/50">Card payment · {reference}</p>

        <div className="mt-4 flex flex-col gap-4">
          {status?.errorMessage ? <TerminalRejection status={status} /> : null}

          {status && !status.errorMessage && !settled ? (
            <TerminalDisplay status={status} onPress={press} />
          ) : null}

          {!status && !error ? (
            <p className="py-8 text-center text-sm text-ink/60">Waking the terminal…</p>
          ) : null}

          {settled === 'paid' ? (
            <>
              <Outcome
                tone="good"
                title="Approved"
                body="The order is paid and sent to the kitchen."
              />
              <a
                href={`/admin/orders/${orderId}/receipt?print=1`}
                target="_blank"
                rel="noreferrer"
                className="rounded-[var(--radius-btn)] bg-brand px-4 py-3 text-center text-sm font-semibold text-surface"
              >
                Print bill
              </a>
            </>
          ) : null}

          {settled === 'failed' ? (
            <Outcome
              tone="bad"
              title="Declined"
              body={status?.result?.responseText ?? 'The card was declined.'}
            />
          ) : null}

          {/* Deliberately no cash-settle button here — an unexplained amount
              difference is not something to paper over by marking it paid. */}
          {settled === 'mismatch' ? (
            <Outcome
              tone="bad"
              title="Needs manual review"
              body="The terminal reported a different amount from the order total. Do not fulfil this order until it is checked in Payline."
            />
          ) : null}

          {error ? (
            <p role="alert" className="text-sm font-medium text-brand">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {settled === 'failed' ? (
            <>
              <button type="button" onClick={onSettleCash} className={SECONDARY}>
                Mark paid (cash)
              </button>
              <button type="button" onClick={onRetry} className={PRIMARY}>
                Try again
              </button>
            </>
          ) : null}
          <button type="button" onClick={onClose} className={SECONDARY}>
            {done ? 'Close' : 'Hide'}
          </button>
        </div>

        {!done ? (
          <p className="mt-3 text-xs text-ink/40">
            Hiding this does not cancel the sale — it keeps running on the terminal.
          </p>
        ) : null}
      </div>
    </div>
  );
}

const PRIMARY =
  'rounded-[var(--radius-btn)] bg-brand px-4 py-2 text-sm font-semibold text-surface';
const SECONDARY = 'rounded-[var(--radius-btn)] border border-line px-4 py-2 text-sm font-medium';

function Outcome({ tone, title, body }: { tone: 'good' | 'bad'; title: string; body: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border px-5 py-4 ${
        tone === 'good' ? 'border-brand' : 'border-line'
      }`}
    >
      <p className="font-display text-2xl">{title}</p>
      <p className="mt-1 text-sm text-ink/70">{body}</p>
    </div>
  );
}
