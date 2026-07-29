import type { Metadata } from 'next';
import { getMenu } from '@/lib/db/get-menu';
import { CategoryChips } from '@/components/menu/category-chips';
import { MenuCategorySection } from '@/components/menu/menu-category';
import { JsonLd } from '@/components/seo/json-ld';
import { menuJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Menu',
  description:
    'Browse the Viki menu — charcoal-grilled signatures, phở, and Vietnamese street-food mains. Order pickup or delivery.',
  alternates: { canonical: '/menu' },
};

export default async function MenuPage() {
  const menu = await getMenu();

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <JsonLd data={menuJsonLd(menu)} />
      <header className="py-8">
        <h1 className="text-4xl">Menu</h1>
        <p className="mt-2 text-muted">
          Customise your dishes and add them to your cart — pickup or delivery.
        </p>
      </header>

      <CategoryChips />

      <div className="mt-8 flex flex-col gap-12">
        {menu.map((category) => (
          <MenuCategorySection key={category.id} category={category} />
        ))}
      </div>
    </main>
  );
}
