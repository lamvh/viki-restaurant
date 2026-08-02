'use client';

import Link from 'next/link';

import { RESTAURANT } from '@/data/restaurant';
import { useHydrated } from '@/lib/use-hydrated';
import { useCartStore } from '@/store/cart-store';

import { ServiceToggle } from './service-toggle';

const NAV = [
  { href: '/#menu', label: 'Menu' },
  { href: '/#our-kitchen', label: 'Our kitchen' },
  { href: '/#delivery-zone', label: 'Delivery zone' },
  { href: '/#find-us', label: 'Find us' },
];

/** Sticky top navigation: brand, section links, service toggle, order button. */
export function SiteHeader() {
  // Select the array (stable ref) and derive count in render — avoids the
  // "getSnapshot should be cached" pitfall of returning a computed value.
  const cart = useCartStore((s) => s.cart);
  const openCart = useCartStore((s) => s.openCart);
  const hydrated = useHydrated();
  const count = hydrated ? cart.reduce((sum, l) => sum + l.qty, 0) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="flex h-[var(--header-h)] items-center justify-between gap-5 px-4 sm:px-8 lg:px-11">
        <Link href="/" className="flex shrink-0 items-baseline gap-2.5 text-ink">
          <span className="font-display text-[28px] leading-none">{RESTAURANT.name}</span>
          <span className="hidden text-[9.5px] font-bold uppercase tracking-[2px] text-[#9a9a9a] sm:inline">
            {RESTAURANT.tagline}
          </span>
        </Link>

        <nav className="hidden flex-wrap gap-[clamp(14px,2vw,30px)] text-[13.5px] font-medium lg:flex">
          {NAV.map((link) => (
            <Link key={link.href} href={link.href} className="text-[#444] hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3.5">
          <ServiceToggle className="hidden sm:inline-flex" />

          {/* Empty cart → jump to the menu. Once there is something in it the
              same button reviews the order, which is what people reach for. */}
          {count > 0 ? (
            <button
              type="button"
              onClick={openCart}
              className="rounded-lg bg-ink px-[18px] py-2.5 text-[13.5px] font-bold text-surface"
              aria-label={`Review your order, ${count} ${count === 1 ? 'item' : 'items'}`}
            >
              Order · {count}
            </button>
          ) : (
            <Link
              href="/#menu"
              className="rounded-lg bg-ink px-[18px] py-2.5 text-[13.5px] font-bold text-surface"
            >
              Order
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
