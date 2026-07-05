'use client';

import type { CartLine as CartLineType } from '@/types/cart';
import { useCartStore } from '@/store/cart-store';
import { Money } from '@/components/ui/money';

/** A single cart line with quantity controls (decrement removes at 0). */
export function CartLine({ line }: { line: CartLineType }) {
  const incLine = useCartStore((s) => s.incLine);
  const decLine = useCartStore((s) => s.decLine);

  return (
    <div className="flex gap-3 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-tight">{line.name}</p>
        {line.labels.length ? (
          <p className="mt-0.5 text-xs text-muted">{line.labels.join(' · ')}</p>
        ) : null}
        {line.notes ? (
          <p className="mt-0.5 text-xs italic text-muted">“{line.notes}”</p>
        ) : null}
        <div className="mt-2 inline-flex items-center rounded-[var(--radius-pill)] border border-line">
          <button
            type="button"
            onClick={() => decLine(line.key)}
            aria-label={line.qty > 1 ? 'Decrease quantity' : 'Remove item'}
            className="px-2.5 py-1 text-subtle hover:text-ink"
          >
            −
          </button>
          <span className="w-7 text-center text-sm" aria-live="polite">
            {line.qty}
          </span>
          <button
            type="button"
            onClick={() => incLine(line.key)}
            aria-label="Increase quantity"
            className="px-2.5 py-1 text-subtle hover:text-ink"
          >
            +
          </button>
        </div>
      </div>
      <Money value={line.unit * line.qty} className="shrink-0 text-sm font-medium" />
    </div>
  );
}
