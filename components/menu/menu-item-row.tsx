'use client';

import type { MenuItem } from '@/types/menu';
import { useCartStore } from '@/store/cart-store';
import { TagBadge } from '@/components/ui/tag-badge';
import { Money } from '@/components/ui/money';
import { ImageSlot } from '@/components/ui/image-slot';

/** Tappable menu row — opens the item customisation modal. */
export function MenuItemRow({ item }: { item: MenuItem }) {
  const openItem = useCartStore((s) => s.openItem);
  const customisable = (item.groups?.length ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={() => openItem(item.id)}
      className="flex w-full items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-3 text-left transition-colors hover:border-line-strong"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-base leading-tight">{item.name}</h3>
          <Money value={item.price} className="shrink-0 text-sm font-medium text-brand" />
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{item.desc}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {item.tags?.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {customisable ? (
            <span className="text-xs text-subtle">Customise →</span>
          ) : null}
        </div>
      </div>
      <ImageSlot label={item.name} className="h-20 w-20 shrink-0" />
    </button>
  );
}
