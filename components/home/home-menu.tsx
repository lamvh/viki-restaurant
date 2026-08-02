'use client';

import { useMemo, useState } from 'react';

import { ORDERING } from '@/data/restaurant';
import { formatHour, isDinnerService } from '@/lib/home/service-window';
import { isDinnerOnly } from '@/lib/menu/dinner-only';
import type { MenuCategory } from '@/types/menu';

import { DishCard } from './dish-card';
import { DishRow } from './dish-row';
import { useRestaurantHour } from './use-restaurant-hour';

const ALL = 'all';

/**
 * The full menu, inline on the homepage.
 *
 * A category renders as compact rows rather than photo cards when none of its
 * dishes has a photo — which is how the design separates drinks and extras from
 * the food, without hard-coding those two category names.
 */
export function HomeMenu({
  menu,
  initialHour,
}: {
  menu: MenuCategory[];
  initialHour: number;
}) {
  const [activeId, setActiveId] = useState(ALL);
  const hour = useRestaurantHour(initialHour);

  const dinner = isDinnerService(hour, ORDERING.dinnerFromHour);
  const dinnerFrom = formatHour(ORDERING.dinnerFromHour);

  const dishCount = useMemo(
    () => menu.reduce((sum, category) => sum + category.items.length, 0),
    [menu],
  );

  const sections = activeId === ALL ? menu : menu.filter((c) => c.id === activeId);
  const tabs = [{ id: ALL, name: 'All · Tất cả' }, ...menu.map((c) => ({ id: c.id, name: c.name }))];

  return (
    <section
      id="menu"
      className="scroll-mt-[var(--header-h)] border-t border-line px-4 pb-12 pt-9 sm:px-8 lg:px-11"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="text-[clamp(26px,3.4vw,36px)]">Full menu · Thực đơn</h2>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {dishCount} {dishCount === 1 ? 'dish' : 'dishes'} across {menu.length}{' '}
            {menu.length === 1 ? 'group' : 'groups'} · all prices include GST
          </p>
        </div>
        <p className="text-[13px] text-muted">
          Cooking to order — tell our staff about allergies or dietary needs and we will adjust the
          plate.
        </p>
      </div>

      {menu.length === 0 ? (
        <p className="mt-8 rounded-[14px] border border-dashed border-line-strong px-6 py-14 text-center text-sm text-muted">
          Our menu is being updated. Call{' '}
          <a href="tel:+6492161686" className="font-semibold">
            +64 9 216 1686
          </a>{' '}
          and we will tell you what is on today.
        </p>
      ) : (
        <>
          <div className="mb-4 mt-[22px] flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = tab.id === activeId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveId(tab.id)}
                  aria-pressed={active}
                  className={`rounded-[var(--radius-pill)] border px-4 py-[9px] text-[13px] font-semibold transition-colors ${
                    active
                      ? 'border-ink bg-ink text-surface'
                      : 'border-line-strong bg-surface text-subtle hover:border-ink/40'
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

          <div className="pt-3">
            {sections.map((category) => {
              // No photos in the whole group → the compact row treatment.
              const compact = category.items.every((item) => !item.image);

              return (
                <div key={category.id} className="mb-9">
                  <div className="mb-5 flex flex-wrap items-baseline gap-3 border-b border-line pb-2.5">
                    <h3 className="text-[clamp(22px,2.6vw,28px)]">{category.name}</h3>
                    <span className="ml-auto text-xs text-[#9a9a9a]">
                      {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {category.items.length === 0 ? (
                    <p className="py-6 text-[13px] text-muted">
                      Nothing in this group today — ask our staff what has replaced it.
                    </p>
                  ) : compact ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-x-[26px] gap-y-2.5">
                      {category.items.map((item) => {
                        const locked = isDinnerOnly(item) && !dinner;
                        return (
                          <DishRow
                            key={item.id}
                            item={item}
                            locked={locked}
                            lockedLabel={`Available from ${dinnerFrom}`}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(238px,1fr))] gap-[clamp(14px,1.8vw,24px)]">
                      {category.items.map((item) => {
                        const locked = isDinnerOnly(item) && !dinner;
                        return (
                          <DishCard
                            key={item.id}
                            item={item}
                            locked={locked}
                            lockedLabel={`Available from ${dinnerFrom}`}
                            lockedNotice={`Dinner only · từ ${dinnerFrom} mỗi ngày`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
