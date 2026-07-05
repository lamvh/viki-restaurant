import type { Metadata } from 'next';
import { MENU } from '@/data/menu';
import { CategoryChips } from '@/components/menu/category-chips';
import { MenuCategorySection } from '@/components/menu/menu-category';

export const metadata: Metadata = {
  title: 'Menu — Viki',
  description: 'Browse the Viki menu and order pickup or delivery.',
};

export default function MenuPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <header className="py-8">
        <h1 className="text-4xl">Menu</h1>
        <p className="mt-2 text-muted">
          Customise your dishes and add them to your cart — pickup or delivery.
        </p>
      </header>

      <CategoryChips />

      <div className="mt-8 flex flex-col gap-12">
        {MENU.map((category) => (
          <MenuCategorySection key={category.id} category={category} />
        ))}
      </div>
    </main>
  );
}
