'use client';

import { ORDERING } from '@/data/restaurant';
import { formatHour, isDinnerService } from '@/lib/home/service-window';
import { isDinnerOnly } from '@/lib/menu/dinner-only';
import type { MenuItem } from '@/types/menu';

import { DishCard } from './dish-card';
import { useRestaurantHour } from './use-restaurant-hour';

/**
 * "Popular right now" — the featured dishes, with a line that changes when the
 * charcoal grill comes on for dinner service.
 */
export function PopularDishes({
  items,
  initialHour,
}: {
  items: MenuItem[];
  initialHour: number;
}) {
  const hour = useRestaurantHour(initialHour);
  const dinner = isDinnerService(hour, ORDERING.dinnerFromHour);
  const dinnerFrom = formatHour(ORDERING.dinnerFromHour);

  if (items.length === 0) return null;

  return (
    <section className="px-4 pb-12 sm:px-8 lg:px-11">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-[clamp(24px,3vw,32px)]">Popular right now</h2>
        <p className="text-[12.5px] text-muted">
          {dinner
            ? 'Dinner service · the charcoal grill is on'
            : `Lunch service · grill plates from ${dinnerFrom}`}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[clamp(14px,2vw,26px)]">
        {items.map((item) => {
          const locked = isDinnerOnly(item) && !dinner;
          return (
            <DishCard
              key={item.id}
              item={item}
              imageClassName="h-[170px]"
              locked={locked}
              lockedLabel={`Available from ${dinnerFrom}`}
              lockedNotice={`Dinner only · từ ${dinnerFrom} mỗi ngày`}
            />
          );
        })}
      </div>
    </section>
  );
}
