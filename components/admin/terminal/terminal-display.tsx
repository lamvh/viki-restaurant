'use client';

import type { HitButtonValue, HitStatus } from '@/lib/windcave/hit-types';

/**
 * Mirrors the terminal's own screen: `DL1`/`DL2` rendered verbatim, plus any
 * soft buttons it is offering. Never paraphrase these — this screen and the
 * device must not disagree about what the cardholder is being asked.
 */
export function TerminalDisplay({
  status,
  onPress,
}: {
  status: HitStatus;
  onPress: (name: 'B1' | 'B2', value: HitButtonValue) => void;
}) {
  return (
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
              onClick={() => onPress(name, (button.label || 'YES') as HitButtonValue)}
              className="rounded-[var(--radius-btn)] border border-line px-4 py-2 text-sm font-medium"
            >
              {button.label || name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** An envelope-level refusal — the request was rejected, not the card declined. */
export function TerminalRejection({ status }: { status: HitStatus }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-brand bg-surface px-5 py-4">
      <p className="text-sm font-semibold">
        Request rejected {status.errorCode ? `(code ${status.errorCode})` : null}
      </p>
      <p className="mt-1 text-sm">{status.errorMessage}</p>
    </div>
  );
}
