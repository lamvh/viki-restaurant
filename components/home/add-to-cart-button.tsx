'use client';

import { buildCartLine, defaultSelections } from '@/lib/build-cart-line';
import { useHydrated } from '@/lib/use-hydrated';
import { useCartStore } from '@/store/cart-store';
import type { MenuItem } from '@/types/menu';

/**
 * The homepage "Add +" affordance, in card and compact-row shapes.
 *
 * A dish with option groups opens the existing customisation modal rather than
 * guessing: the design's one-tap add would silently commit whatever the first
 * choice happens to be, and the customer would only find out at checkout. A
 * plain dish goes straight into the cart.
 */
export function AddToCartButton({
  item,
  locked,
  lockedLabel,
  variant = 'card',
}: {
  item: MenuItem;
  /** Dinner-only dish outside dinner service. */
  locked?: boolean;
  lockedLabel?: string;
  variant?: 'card' | 'row';
}) {
  const cart = useCartStore((s) => s.cart);
  const addLine = useCartStore((s) => s.addLine);
  const openItem = useCartStore((s) => s.openItem);
  const hydrated = useHydrated();

  // Quantities only exist client-side (the cart is persisted in localStorage),
  // so the server render always shows the neutral "Add +" state.
  const qty = hydrated ? cart.reduce((sum, l) => (l.id === item.id ? sum + l.qty : sum), 0) : 0;

  function add() {
    if (locked) return;
    if (item.groups?.length) {
      openItem(item.id);
      return;
    }
    addLine(buildCartLine(item, defaultSelections(item), 1, ''));
  }

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={add}
        disabled={locked}
        aria-label={locked ? `${item.name} — ${lockedLabel}` : `Add ${item.name} to your order`}
        className={`h-[34px] w-[34px] shrink-0 rounded-[9px] border text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          qty
            ? 'border-brand bg-brand text-surface'
            : 'border-line-strong bg-surface text-ink hover:border-ink'
        }`}
      >
        {qty || '+'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={locked}
      aria-label={locked ? `${item.name} — ${lockedLabel}` : `Add ${item.name} to your order`}
      className={`mt-0.5 w-full rounded-[9px] border-none px-4 py-[11px] text-[13.5px] font-bold transition-colors ${
        locked
          ? 'cursor-not-allowed bg-[#f0f0f0] text-[#a5a5a5]'
          : qty
            ? 'bg-brand text-surface'
            : 'bg-[#f4f4f4] text-ink hover:bg-[#ebebeb]'
      }`}
    >
      {locked ? lockedLabel : qty ? `Added · ${qty}` : 'Add +'}
    </button>
  );
}
