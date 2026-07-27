'use client';

import { useState } from 'react';

import { money } from '@/lib/format';
import type { MenuCategory, MenuItem } from '@/types/menu';

/** Menu tiles for ringing up a counter sale. Tap adds one to the order. */
export function PosMenuGrid({
  categories,
  onAdd,
}: {
  categories: MenuCategory[];
  onAdd: (item: MenuItem) => void;
}) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? '');
  const active = categories.find((c) => c.id === activeId) ?? categories[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveId(category.id)}
            className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm ${
              category.id === active?.id
                ? 'border-brand text-brand'
                : 'border-line text-ink/70'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {active?.items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onAdd(item)}
            className="flex min-h-[5.5rem] flex-col justify-between rounded-[var(--radius-card)] border border-line bg-surface p-3 text-left transition-colors hover:border-brand"
          >
            <span className="text-sm font-medium leading-tight">{item.name}</span>
            <span className="mt-2 text-sm text-ink/60">{money(item.price)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
