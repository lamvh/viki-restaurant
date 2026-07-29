'use client';

import { money } from '@/lib/format';
import { useFocusTrap } from '@/lib/use-focus-trap';

/**
 * Choose how the counter sale is settled.
 *
 * The design's payment modal also offers bill splitting and tipping. Neither has
 * anything behind it — no split-payment records, no tip column — so this offers
 * the two methods that are actually wired: the Windcave terminal and cash.
 */
export function PosPaymentSheet({
  total,
  pending,
  onCard,
  onCash,
  onClose,
}: {
  total: number;
  pending: boolean;
  onCard: () => void;
  onCash: () => void;
  onClose: () => void;
}) {
  const panelRef = useFocusTrap<HTMLDivElement>(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Take payment"
      className="fixed inset-0 z-95 flex items-end justify-center bg-[rgb(23_19_15/0.6)] min-[820px]:items-center min-[820px]:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-[470px] rounded-t-[20px] bg-admin-bg outline-none min-[820px]:rounded-[18px]"
      >
        <div className="flex items-center gap-3 px-[22px] pb-3 pt-[18px]">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl leading-tight">Take payment</h2>
            <p className="text-xs text-admin-muted">Counter sale</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-[34px] w-[34px] shrink-0 rounded-full bg-admin-well text-base text-admin-muted"
          >
            ✕
          </button>
        </div>

        <div className="px-[22px] pb-[22px]">
          <div className="mb-3.5 flex items-baseline justify-between rounded-[12px] border border-admin-line bg-admin-card px-4 py-3.5">
            <span className="text-[12.5px] font-bold text-admin-muted">Due now</span>
            <span className="font-display text-[26px] leading-none">{money(total)}</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <button type="button" onClick={onCard} disabled={pending} className={METHOD}>
              <span className={ICON}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="6" y="2" width="12" height="20" rx="2" />
                  <path d="M9 6h6M9 18h6" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[14.5px] font-bold">Card terminal</span>
                <span className="block text-[11.5px] text-admin-faint">Windcave HIT · tap or insert</span>
              </span>
              <span className="shrink-0 text-lg text-admin-faint">›</span>
            </button>

            <button type="button" onClick={onCash} disabled={pending} className={METHOD}>
              <span className={ICON}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[14.5px] font-bold">Cash</span>
                <span className="block text-[11.5px] text-admin-faint">Settle in the drawer</span>
              </span>
              <span className="shrink-0 text-lg text-admin-faint">›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const METHOD =
  'flex items-center gap-3 rounded-[12px] border border-admin-line bg-admin-card p-3.5 text-admin-ink transition-colors hover:border-admin-ink/30 disabled:opacity-50';
const ICON =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-admin-well text-admin-ink';
