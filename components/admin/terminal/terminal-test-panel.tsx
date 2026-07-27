'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  pollTestPurchase,
  pressTestButton,
  startTestPurchase,
} from '@/app/admin/terminal-test/actions';
import {
  DEFAULT_TEST_AMOUNT,
  MAX_TEST_AMOUNT,
  type SpikeResult,
} from '@/app/admin/terminal-test/spike-config';
import type { HitButton, HitButtonValue, HitStatus } from '@/lib/windcave/hit-types';

import { TerminalDebugPanels, TerminalResultCard } from './terminal-debug-panels';
import { TerminalDisplay, TerminalRejection } from './terminal-display';

const POLL_MS = 1000;
/** ~2 minutes. Past this the terminal has almost certainly gone quiet. */
const MAX_TICKS = 120;

type Phase = 'idle' | 'running' | 'complete' | 'error';

/** Whichever soft button the terminal is currently offering, if any. */
function offeredButton(status: HitStatus | null): { name: 'B1' | 'B2'; button: HitButton } | null {
  if (status?.b2?.enabled) return { name: 'B2', button: status.b2 };
  if (status?.b1?.enabled) return { name: 'B1', button: status.b1 };
  return null;
}

export function TerminalTestPanel({ currency }: { currency: string }) {
  const [amount, setAmount] = useState(DEFAULT_TEST_AMOUNT.toFixed(2));
  const [phase, setPhase] = useState<Phase>('idle');
  const [txnRef, setTxnRef] = useState<string | null>(null);
  const [status, setStatus] = useState<HitStatus | null>(null);
  /** The Purchase reply, kept separately — polling would overwrite it in 1s. */
  const [purchase, setPurchase] = useState<HitStatus | null>(null);
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
    setPurchase(null);
    setError(null);
    setTicks(0);
    inFlight.current = false;

    const result = await startTestPurchase(amount);
    if (result.ok) {
      setTxnRef(result.txnRef);
      setPurchase(result.status);
      // A Purchase that returns already complete was rejected outright. Polling
      // it would only report "TxnRef not matched" and bury the reason.
      if (result.status.complete) {
        setStatus(result.status);
        setPhase('complete');
        return;
      }
    }
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

  const running = phase === 'running';
  const offered = offeredButton(status);
  const rejection = purchase?.errorMessage ? purchase : status?.errorMessage ? status : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-sm font-semibold">
            Amount ({currency})
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            max={MAX_TEST_AMOUNT}
            value={amount}
            disabled={running}
            onChange={(e) => setAmount(e.target.value)}
            className="w-40 rounded-[var(--radius-btn)] border border-line px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
          />
        </div>

        <button
          type="button"
          onClick={start}
          disabled={running}
          className="rounded-[var(--radius-btn)] bg-brand px-4 py-2.5 text-sm font-semibold text-surface disabled:opacity-50"
        >
          {running ? 'Sale in progress…' : 'Charge terminal'}
        </button>

        {/* The protocol has no Cancel transaction type — a sale can only be
            stopped from here while the terminal is offering a button. */}
        {running ? (
          <button
            type="button"
            onClick={() => offered && press(offered.name, 'CANCEL')}
            disabled={!offered}
            title={
              offered
                ? `Sends ${offered.name}=CANCEL`
                : 'The terminal is not offering a button right now — cancel on the device itself.'
            }
            className="rounded-[var(--radius-btn)] border border-line px-4 py-2.5 text-sm font-medium disabled:opacity-40"
          >
            Cancel
          </button>
        ) : null}

        {txnRef ? (
          <code className="text-xs text-ink/50">
            {txnRef} · {ticks} poll{ticks === 1 ? '' : 's'}
          </code>
        ) : null}
      </div>

      {running && !offered ? (
        <p className="text-xs text-ink/50">
          Cancel is unavailable until the terminal offers a button. The protocol has no
          POS-initiated cancel — until then, press the red key on the device.
        </p>
      ) : null}

      {rejection ? <TerminalRejection status={rejection} /> : null}

      {status && !rejection ? <TerminalDisplay status={status} onPress={press} /> : null}

      {status?.result ? <TerminalResultCard result={status.result} /> : null}

      {error ? (
        <div className="rounded-[var(--radius-card)] border border-brand bg-surface px-5 py-4">
          <p className="text-sm font-semibold">Error</p>
          {/* Verbatim — a prettified error hides the cause it exists to reveal. */}
          <pre className="mt-2 overflow-x-auto text-xs whitespace-pre-wrap">{error}</pre>
        </div>
      ) : null}

      <TerminalDebugPanels purchase={purchase} latest={status} />
    </div>
  );
}
