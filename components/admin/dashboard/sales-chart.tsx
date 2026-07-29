import type { ChartBar } from '@/lib/admin/dashboard-aggregate';
import { money } from '@/lib/format';

/** Compact axis label: "$1.3k" above $1000, "$840" below. */
function shortMoney(value: number): string {
  return value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${Math.round(value)}`;
}

/**
 * Seven-day takings, as a bar per day with today picked out in red.
 *
 * Bars are scaled against the best day in the window, so a quiet week still
 * fills the panel rather than collapsing into a flat line.
 */
export function SalesChart({ bars }: { bars: ChartBar[] }) {
  const peak = Math.max(...bars.map((b) => b.value), 0);
  const total = bars.reduce((sum, b) => sum + b.value, 0);

  return (
    <div className="rounded-[14px] border border-admin-line bg-admin-card px-[22px] py-5">
      <div className="mb-[18px] flex items-baseline justify-between">
        <h2 className="text-[15.5px] font-bold">Sales · last 7 days</h2>
        <p className="text-[12.5px] text-admin-muted">
          Total <span className="font-bold text-admin-ink">{money(total)}</span>
        </p>
      </div>

      <div className="flex h-[170px] items-end gap-3">
        {bars.map((bar, index) => (
          <div
            key={`${bar.day}-${index}`}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <span className="text-[11px] font-semibold text-admin-muted">
              {shortMoney(bar.value)}
            </span>
            <div
              className={`w-full max-w-[46px] rounded-t-[7px] rounded-b-[3px] ${
                bar.isToday ? 'bg-admin-red' : 'bg-brand'
              }`}
              // A zero-takings day still needs a visible sliver, or the column
              // reads as missing data rather than as a quiet day.
              style={{ height: `${peak > 0 ? Math.max((bar.value / peak) * 100, 1.5) : 1.5}%` }}
            />
            <span className="text-[11px] text-admin-faint">{bar.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
