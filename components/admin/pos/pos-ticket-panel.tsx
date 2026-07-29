'use client';

import { money } from '@/lib/format';
import { gstIncludedIn } from '@/lib/pricing-gst';
import type { Totals } from '@/lib/pricing';
import type { CartLine } from '@/types/cart';

/**
 * The running ticket: lines, quantities and what is owed.
 *
 * The GST row is derived from the total rather than added to it — menu prices
 * are GST-inclusive, so this reports the tax already inside the figure staff are
 * about to charge.
 */
export function PosTicketPanel({
  lines,
  totals,
  onInc,
  onDec,
  onNote,
  onClear,
  onPay,
  pending,
  compact = false,
}: {
  lines: CartLine[];
  totals: Totals;
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  onNote: (key: string, notes: string) => void;
  onClear: () => void;
  onPay: () => void;
  pending: boolean;
  /** Larger touch targets for the mobile sheet. */
  compact?: boolean;
}) {
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const step = compact ? 'h-[38px] w-[38px] text-lg' : 'h-[30px] w-[30px] text-base';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!compact ? (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-admin-line px-[18px] py-4">
          <div className="flex-1">
            <p className="text-[15px] font-extrabold">Ticket</p>
            <p className="text-xs text-admin-muted">
              {count} {count === 1 ? 'item' : 'items'}
            </p>
          </div>
          {lines.length > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-[9px] border border-admin-line-strong bg-white px-3 py-[7px] text-xs font-bold text-admin-muted"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-1.5">
        {lines.length === 0 ? (
          <p className="px-3.5 py-14 text-center text-[13.5px] leading-relaxed text-admin-faint">
            Tap dishes to build the ticket.
            <br />
            Payment is taken at the till.
          </p>
        ) : (
          lines.map((line) => (
            <div key={line.key} className="border-b border-admin-line py-2.5 last:border-b-0">
              <div className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{line.name}</p>
                  <p className="text-[11.5px] text-admin-faint">
                    {money(line.unit)} each
                    {line.labels.length > 0 ? ` · ${line.labels.join(' · ')}` : ''}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDec(line.key)}
                    aria-label={`Remove one ${line.name}`}
                    className={`rounded-[8px] border border-admin-line-strong bg-white font-bold leading-none ${step}`}
                  >
                    −
                  </button>
                  <span className="min-w-4 text-center text-sm font-extrabold">{line.qty}</span>
                  <button
                    type="button"
                    onClick={() => onInc(line.key)}
                    aria-label={`Add one ${line.name}`}
                    className={`rounded-[8px] border border-admin-line-strong bg-white font-bold leading-none ${step}`}
                  >
                    +
                  </button>
                </div>

                <span className="w-14 shrink-0 text-right text-sm font-bold">
                  {money(line.unit * line.qty)}
                </span>
              </div>

              {/* Reaches the kitchen ticket and the printed bill. */}
              <input
                type="text"
                value={line.notes}
                onChange={(e) => onNote(line.key, e.target.value)}
                placeholder="Note (e.g. no coriander)"
                className="mt-1.5 w-full rounded-[8px] border border-admin-line bg-white px-2 py-1 text-xs outline-none focus:border-brand"
              />
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-admin-line px-[18px] pb-4 pt-3.5">
        <div className="mb-1 flex justify-between text-[13px] text-admin-muted">
          <span>Subtotal</span>
          <span>{money(totals.subtotal)}</span>
        </div>
        {totals.hasDiscount ? (
          <div className="mb-1 flex justify-between text-[13px] text-admin-muted">
            <span>Discount (10%)</span>
            <span>−{money(totals.discount)}</span>
          </div>
        ) : null}
        <div className="mb-2 flex justify-between text-[13px] text-admin-muted">
          <span>GST 15% (incl.)</span>
          <span>{money(gstIncludedIn(totals.total))}</span>
        </div>

        <div className="flex items-baseline justify-between border-t border-admin-line pt-2">
          <span className="text-[15px] font-extrabold">Total</span>
          <span className="font-display text-[32px] leading-none">{money(totals.total)}</span>
        </div>

        <button
          type="button"
          onClick={onPay}
          disabled={pending || lines.length === 0}
          className="mt-3.5 w-full rounded-[12px] bg-brand px-4 py-4 text-[15px] font-bold text-white disabled:opacity-50"
        >
          {pending ? 'Working…' : `Take payment · ${money(totals.total)}`}
        </button>
        <p className="mt-2 text-center text-[11.5px] text-admin-faint">
          Windcave terminal · cash
        </p>
      </div>
    </div>
  );
}
