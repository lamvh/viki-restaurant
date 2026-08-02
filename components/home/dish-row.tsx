import { Money } from '@/components/ui/money';
import { TagBadges } from '@/components/ui/tag-badge';
import type { MenuItem } from '@/types/menu';

import { AddToCartButton } from './add-to-cart-button';

/**
 * Compact list row — the design's treatment for drinks and extras, where a
 * photo per line would be noise rather than appetite.
 */
export function DishRow({
  item,
  locked = false,
  lockedLabel,
}: {
  item: MenuItem;
  locked?: boolean;
  lockedLabel?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-dotted border-line-strong py-[11px] ${
        locked ? 'opacity-[.72]' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-[14.5px] font-bold">{item.name}</h3>
          <TagBadges tags={item.tags} />
        </div>
        {item.desc ? <p className="mt-0.5 text-[12.5px] text-muted">{item.desc}</p> : null}
      </div>

      <Money value={item.price} className="shrink-0 text-[14.5px] font-bold text-brand" />
      <AddToCartButton item={item} locked={locked} lockedLabel={lockedLabel} variant="row" />
    </div>
  );
}
