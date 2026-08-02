import Link from 'next/link';

import { ORDERING } from '@/data/restaurant';
import { moneyLabel } from '@/lib/format';

/** Thin offer bar across the top of every page. */
export function PromoBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 bg-brand px-5 py-[9px] text-center text-[12.5px] font-semibold text-surface">
      <span>{ORDERING.promo}</span>
      <span aria-hidden="true" className="opacity-50">
        ·
      </span>
      <span>
        Flat {moneyLabel(ORDERING.deliveryFee)} delivery within {ORDERING.deliveryRadiusKm} km of
        Glenfield Mall
      </span>
      <span aria-hidden="true" className="opacity-50">
        ·
      </span>
      <Link href="/#delivery-zone" className="text-[#CFE8D9] underline hover:text-surface">
        Check your suburb
      </Link>
    </div>
  );
}
