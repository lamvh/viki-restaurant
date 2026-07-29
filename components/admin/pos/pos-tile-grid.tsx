'use client';

import { useMemo, useState } from 'react';

import { ImageSlot } from '@/components/ui/image-slot';
import { money } from '@/lib/format';
import type { MenuCategory, MenuItem } from '@/types/menu';

const ALL = 'all';

/**
 * Dish tiles for ringing up a counter sale.
 *
 * A tile carries the running quantity for that dish so staff can see what is on
 * the ticket without looking away from the grid — the single most useful signal
 * on a busy till.
 */
export function PosTileGrid({
  categories,
  quantities,
  onAdd,
}: {
  categories: MenuCategory[];
  /** Units already on the ticket, keyed by menu item id. */
  quantities: Record<string, number>;
  onAdd: (item: MenuItem) => void;
}) {
  const [activeId, setActiveId] = useState(ALL);
  const [search, setSearch] = useState('');

  const allItems = useMemo(() => categories.flatMap((c) => c.items), [categories]);

  const visible = useMemo(() => {
    const base = activeId === ALL ? allItems : (categories.find((c) => c.id === activeId)?.items ?? []);
    const query = search.trim().toLowerCase();
    return query ? base.filter((item) => item.name.toLowerCase().includes(query)) : base;
  }, [activeId, allItems, categories, search]);

  const tabs = [{ id: ALL, name: 'All' }, ...categories.map((c) => ({ id: c.id, name: c.name }))];

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-3 min-[820px]:px-[30px]">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              aria-pressed={active}
              className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
                active
                  ? 'border-admin-ink bg-admin-ink text-admin-bg'
                  : 'border-admin-line-strong bg-admin-card text-admin-ink/80'
              }`}
            >
              {tab.name}
            </button>
          );
        })}

        <label className="ml-auto flex w-[230px] items-center gap-2 rounded-[10px] border border-admin-line-strong bg-admin-card px-3 py-2.5">
          <span className="sr-only">Search dishes</span>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
            className="shrink-0 text-admin-faint"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes…"
            className="min-w-0 flex-1 border-none bg-transparent text-[13px] outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 min-[820px]:px-[30px]">
        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-admin-faint">No dishes match this filter.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {visible.map((item) => {
              const qty = quantities[item.id] ?? 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAdd(item)}
                  className="relative overflow-hidden rounded-[14px] border border-admin-line bg-admin-card text-left transition-colors hover:border-admin-ink/30"
                >
                  <ImageSlot
                    label={item.name}
                    src={item.image}
                    shape="rect"
                    className="h-[88px] w-full"
                  />
                  <div className="px-3 pb-3 pt-2.5">
                    <p className="min-h-[34px] text-[13.5px] font-bold leading-[1.25]">{item.name}</p>
                    <div className="mt-1 flex items-baseline justify-between gap-1.5">
                      <span className="font-display text-[19px] text-brand">{money(item.price)}</span>
                    </div>
                  </div>
                  {qty > 0 ? (
                    <span className="absolute right-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-admin-ink px-1.5 text-xs font-extrabold text-admin-bg">
                      {qty}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
