'use client';

import { Money } from '@/components/ui/money';
import type { Totals } from '@/lib/pricing';
import type { CartLine } from '@/types/cart';

/** The running counter order: lines, quantities, and the pricing breakdown. */
export function PosCart({
  lines,
  totals,
  onInc,
  onDec,
  onNote,
}: {
  lines: CartLine[];
  totals: Totals;
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  onNote: (key: string, notes: string) => void;
}) {
  if (lines.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-line px-4 py-10 text-center text-sm text-ink/40">
        Tap a dish to start an order.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col">
        {lines.map((line) => (
          <li key={line.key} className="border-b border-line py-2 last:border-b-0">
            <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{line.name}</p>
              {line.labels.length ? (
                <p className="text-xs text-ink/50">{line.labels.join(' · ')}</p>
              ) : null}
            </div>

            <div className="inline-flex items-center rounded-[var(--radius-pill)] border border-line">
              <button type="button" onClick={() => onDec(line.key)} className={STEP} aria-label={`Remove one ${line.name}`}>
                −
              </button>
              <span className="w-7 text-center text-sm tabular-nums">{line.qty}</span>
              <button type="button" onClick={() => onInc(line.key)} className={STEP} aria-label={`Add one ${line.name}`}>
                +
              </button>
            </div>

            <Money value={line.unit * line.qty} className="w-16 text-right text-sm font-medium" />
            </div>

            {/* Reaches the kitchen ticket and the printed bill. */}
            <input
              type="text"
              value={line.notes}
              onChange={(e) => onNote(line.key, e.target.value)}
              placeholder="Note (e.g. no coriander)"
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-line px-2 py-1 text-xs outline-none focus:border-brand"
            />
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
        <Row label="Subtotal" value={totals.subtotal} />
        {totals.hasDiscount ? <Row label="Discount (10%)" value={-totals.discount} /> : null}
        <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd>
            <Money value={totals.total} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

const STEP = 'px-2.5 py-1 text-sm leading-none';

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-ink/60">
      <dt>{label}</dt>
      <dd>
        <Money value={value} />
      </dd>
    </div>
  );
}
