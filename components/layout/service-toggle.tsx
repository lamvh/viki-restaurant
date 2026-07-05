'use client';

import { useCartStore } from '@/store/cart-store';
import { useHydrated } from '@/lib/use-hydrated';
import type { Service } from '@/types/cart';

const OPTIONS: { value: Service; label: string }[] = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'delivery', label: 'Delivery' },
];

/** Pickup / Delivery segmented control bound to the store's `service`. */
export function ServiceToggle({ className = '' }: { className?: string }) {
  const service = useCartStore((s) => s.service);
  const setService = useCartStore((s) => s.setService);
  const hydrated = useHydrated();

  return (
    <div
      role="group"
      aria-label="Order type"
      className={`inline-flex rounded-[var(--radius-pill)] border border-line bg-surface-alt p-0.5 ${className}`}
    >
      {OPTIONS.map((opt) => {
        // Before hydration, show the SSR default (pickup) as active.
        const active = hydrated ? service === opt.value : opt.value === 'pickup';
        return (
          <button
            key={opt.value}
            aria-pressed={active}
            onClick={() => setService(opt.value)}
            className={`rounded-[var(--radius-pill)] px-3 py-1 text-sm font-medium transition-colors ${
              active ? 'bg-brand text-surface' : 'text-subtle hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
