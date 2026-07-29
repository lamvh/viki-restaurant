import Link from 'next/link';

import type { TopDish } from '@/lib/admin/dashboard-aggregate';
import { money } from '@/lib/format';

/** Today's best sellers, ranked by quantity, with a bar relative to the leader. */
export function TopDishesList({ dishes }: { dishes: TopDish[] }) {
  return (
    <div className="rounded-[14px] border border-admin-line bg-admin-card px-[22px] py-5">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-[15.5px] font-bold">Top dishes today</h2>
        <Link href="/admin/menu" className="text-[12.5px] font-bold text-brand hover:underline">
          Manage menu →
        </Link>
      </div>

      {dishes.length === 0 ? (
        <p className="py-8 text-center text-sm text-admin-faint">
          Nothing sold yet today. Dishes appear here as orders come in.
        </p>
      ) : (
        dishes.map((dish) => (
          <div
            key={dish.name}
            className="flex items-center gap-3.5 border-b border-admin-line py-[11px] last:border-b-0"
          >
            <span className="w-[26px] shrink-0 font-display text-xl text-admin-red">
              {dish.rank}
            </span>
            <div className="w-[130px] shrink-0">
              <p className="truncate text-sm font-semibold">{dish.name}</p>
            </div>
            <div className="h-2 min-w-[60px] flex-1 overflow-hidden rounded-[5px] bg-admin-well">
              <div className="h-full rounded-[5px] bg-brand" style={{ width: `${dish.sharePct}%` }} />
            </div>
            <span className="w-11 shrink-0 text-right text-[13px] font-bold">{dish.qty}</span>
            <span className="w-[60px] shrink-0 text-right text-[13px] text-admin-muted">
              {money(dish.revenue)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
