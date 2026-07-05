'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cart-store';
import { useHydrated } from '@/lib/use-hydrated';
import { ServiceToggle } from './service-toggle';
import { RESTAURANT } from '@/data/restaurant';

/** Sticky top navigation: brand, links, service toggle, and cart button. */
export function SiteHeader() {
  // Select the array (stable ref) and derive count in render — avoids the
  // "getSnapshot should be cached" pitfall of returning a computed value.
  const cart = useCartStore((s) => s.cart);
  const openCart = useCartStore((s) => s.openCart);
  const hydrated = useHydrated();
  const count = cart.reduce((sum, l) => sum + l.qty, 0);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-2xl leading-none text-brand" aria-label={`${RESTAURANT.name} home`}>
          {RESTAURANT.name}
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-subtle md:flex">
          <Link href="/menu" className="hover:text-ink">Menu</Link>
          <Link href="/#story" className="hover:text-ink">Our story</Link>
          <Link href="/#location" className="hover:text-ink">Location</Link>
        </nav>

        <div className="flex items-center gap-3">
          <ServiceToggle className="hidden sm:inline-flex" />
          <button
            onClick={openCart}
            className="relative inline-flex items-center gap-2 rounded-[var(--radius-btn)] bg-ink px-3 py-2 text-sm font-medium text-surface"
            aria-label={`Open cart${hydrated && count > 0 ? `, ${count} items` : ''}`}
          >
            Cart
            {hydrated && count > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-[var(--radius-pill)] bg-brand px-1.5 text-xs">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
