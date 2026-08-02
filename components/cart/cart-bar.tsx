'use client';

import Link from 'next/link';

import { ORDERING } from '@/data/restaurant';
import { money, moneyLabel } from '@/lib/format';
import { useHydrated } from '@/lib/use-hydrated';
import { useCartStore } from '@/store/cart-store';

/**
 * Sticky order summary along the bottom of the page.
 *
 * Only renders once there is something in the cart, and only after hydration —
 * the cart lives in `localStorage`, so the server has nothing to say about it.
 * The spacer keeps the bar from covering the last of the footer.
 */
export function CartBar() {
  const cart = useCartStore((s) => s.cart);
  const service = useCartStore((s) => s.service);
  const clearCart = useCartStore((s) => s.clearCart);
  const openCart = useCartStore((s) => s.openCart);
  const totals = useCartStore((s) => s.totals);
  const hydrated = useHydrated();

  const count = cart.reduce((sum, l) => sum + l.qty, 0);
  if (!hydrated || count === 0) return null;

  const { total } = totals();

  return (
    <>
      <div aria-hidden="true" className="h-[86px]" />

      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center gap-3.5 bg-ink px-4 py-3.5 text-surface shadow-[0_-8px_30px_-12px_rgb(0_0_0/0.45)] sm:px-8 lg:px-11">
        <button
          type="button"
          onClick={openCart}
          className="min-w-[180px] flex-1 text-left"
          aria-label="Review your order"
        >
          <span className="block text-sm font-bold">
            {count} {count === 1 ? 'item' : 'items'} in your order
          </span>
          <span className="block text-[12.5px] text-[#a5a09a]">
            {service === 'delivery'
              ? `Delivery · ${moneyLabel(ORDERING.deliveryFee)} fee included`
              : `Pickup · free, ready in ${ORDERING.prepTime}`}
          </span>
        </button>

        <span className="font-display text-[26px]">{money(total)}</span>

        <button
          type="button"
          onClick={clearCart}
          className="rounded-[9px] border border-white/28 px-4 py-[11px] text-[13px] font-semibold text-[#E8E4DC] hover:border-white/50"
        >
          Clear
        </button>

        <Link
          href="/checkout"
          className="rounded-[9px] bg-surface px-[22px] py-3 text-sm font-bold text-ink"
        >
          Checkout
        </Link>
      </div>
    </>
  );
}
