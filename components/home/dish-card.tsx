import { ImageSlot } from '@/components/ui/image-slot';
import { Money } from '@/components/ui/money';
import { TagBadges } from '@/components/ui/tag-badge';
import type { MenuItem } from '@/types/menu';

import { AddToCartButton } from './add-to-cart-button';

/**
 * Homepage dish card — photo, name, price, description, dietary pills, add.
 *
 * The design shows a Vietnamese and an English name on separate lines. The menu
 * carries one name per dish, so the second line is the description rather than a
 * translation; inventing Vietnamese names for real dishes is not something this
 * component should do.
 */
export function DishCard({
  item,
  imageClassName = 'h-[150px]',
  locked = false,
  lockedLabel,
  lockedNotice,
}: {
  item: MenuItem;
  imageClassName?: string;
  locked?: boolean;
  lockedLabel?: string;
  lockedNotice?: string;
}) {
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-[14px] border border-line bg-surface ${
        locked ? 'opacity-[.72]' : ''
      }`}
    >
      <ImageSlot
        label={item.name}
        src={item.image}
        alt={`${item.name} — ${item.desc || 'Vietnamese dish at Viki Glenfield'}`}
        shape="rect"
        className={`w-full ${imageClassName}`}
      />

      <div className="flex flex-1 flex-col gap-1.5 px-[15px] pb-4 pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-[1.25]">{item.name}</h3>
          <Money value={item.price} className="shrink-0 text-[14.5px] font-bold text-brand" />
        </div>

        {item.desc ? (
          <p className="text-[12.5px] leading-[1.45] text-muted">{item.desc}</p>
        ) : null}

        <TagBadges tags={item.tags} className="mt-auto pt-1" />

        {locked && lockedNotice ? (
          <p className="rounded-[7px] bg-[#F9EDEA] px-[9px] py-1.5 text-[11.5px] font-bold text-[#96382a]">
            {lockedNotice}
          </p>
        ) : null}

        <AddToCartButton item={item} locked={locked} lockedLabel={lockedLabel} />
      </div>
    </article>
  );
}
