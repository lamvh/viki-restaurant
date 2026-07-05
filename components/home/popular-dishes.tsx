import Link from 'next/link';
import { featuredItems } from '@/data/menu';
import { DishCard } from '@/components/ui/dish-card';

/** "Popular right now" — the featured dishes grid on the homepage. */
export function PopularDishes() {
  const items = featuredItems();

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl">Popular right now</h2>
          <p className="mt-1 text-muted">The dishes regulars keep coming back for.</p>
        </div>
        <Link
          href="/menu"
          className="shrink-0 text-sm font-medium text-brand hover:underline"
        >
          View full menu →
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <DishCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
