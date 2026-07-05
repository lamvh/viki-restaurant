import type { MenuItem } from '@/types/menu';
import { ImageSlot } from './image-slot';
import { TagBadge } from './tag-badge';
import { Money } from './money';

/**
 * Presentational dish card: image, name, price, description, dietary tags.
 * Optionally wraps in an interactive affordance via `onSelect` (menu rows use
 * their own row layout; this is the card used on the homepage grid).
 */
export function DishCard({ item }: { item: MenuItem }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <ImageSlot label={item.name} ratio="4 / 3" className="w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg leading-tight">{item.name}</h3>
          <Money value={item.price} className="shrink-0 font-medium text-brand" />
        </div>
        <p className="line-clamp-2 text-sm text-muted">{item.desc}</p>
        {item.tags?.length ? (
          <div className="mt-auto flex flex-wrap gap-1 pt-1">
            {item.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
