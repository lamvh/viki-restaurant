'use client';

import { useHydrated } from '@/lib/use-hydrated';
import { useCartStore } from '@/store/cart-store';
import type { Service } from '@/types/cart';

const OPTIONS: { value: Service; label: string }[] = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'pickup', label: 'Pickup' },
];

/** Delivery / Pickup segmented control bound to the store's `service`. */
export function ServiceToggle({ className = '' }: { className?: string }) {
  const service = useCartStore((s) => s.service);
  const setService = useCartStore((s) => s.setService);
  const hydrated = useHydrated();

  return (
    <div
      role="group"
      aria-label="Order type"
      className={`inline-flex overflow-hidden rounded-lg border border-line-strong ${className}`}
    >
      {OPTIONS.map((opt) => {
        // Before hydration, show the SSR default (pickup) as active.
        const active = hydrated ? service === opt.value : opt.value === 'pickup';
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => setService(opt.value)}
            className={`px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
              active ? 'bg-brand text-surface' : 'text-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
