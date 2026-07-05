import type { MenuCategory } from '@/types/menu';
import { MenuItemRow } from './menu-item-row';

/** A menu category section with an anchor id (targeted by the category chips). */
export function MenuCategorySection({ category }: { category: MenuCategory }) {
  return (
    <section id={category.id} className="scroll-mt-32">
      <h2 className="mb-3 text-2xl">{category.name}</h2>
      <div className="grid gap-3">
        {category.items.map((item) => (
          <MenuItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
