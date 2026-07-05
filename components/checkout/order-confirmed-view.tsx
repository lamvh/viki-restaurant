'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useHydrated } from '@/lib/use-hydrated';
import { Money } from '@/components/ui/money';

/** Client confirmation screen: redirects home when there is no last order. */
export function OrderConfirmedView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const lastOrder = useCartStore((s) => s.lastOrder);
  const clearJustPlaced = useCartStore((s) => s.clearJustPlaced);

  useEffect(() => {
    if (hydrated && !lastOrder) router.replace('/');
  }, [hydrated, lastOrder, router]);

  // The confirmation screen has been reached — end the just-placed transition so a
  // later empty-cart visit to /checkout redirects to /menu as normal.
  useEffect(() => {
    if (hydrated && lastOrder) clearJustPlaced();
  }, [hydrated, lastOrder, clearJustPlaced]);

  if (!hydrated || !lastOrder) return null;

  const serviceLabel = lastOrder.service === 'delivery' ? 'Delivery' : 'Pickup';

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-brand">
        Order confirmed
      </p>
      <h1 className="mt-3 text-4xl">Thanks — we&apos;re on it!</h1>
      <p className="mt-2 text-muted">
        Your order <span className="font-semibold text-ink">{lastOrder.number}</span> has
        been placed.
      </p>

      <dl className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-x-6 gap-y-3 rounded-[var(--radius-card)] border border-line p-6 text-left text-sm">
        <dt className="text-muted">Order</dt>
        <dd className="text-right font-medium">{lastOrder.number}</dd>
        <dt className="text-muted">{serviceLabel} ETA</dt>
        <dd className="text-right font-medium">{lastOrder.eta}</dd>
        <dt className="text-muted">Total</dt>
        <dd className="text-right font-medium">
          <Money value={lastOrder.total} />
        </dd>
        <dt className="text-muted">Points earned</dt>
        <dd className="text-right font-medium">{lastOrder.points}</dd>
      </dl>

      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/menu"
          className="rounded-[var(--radius-btn)] bg-brand px-5 py-3 text-sm font-semibold text-surface"
        >
          Order again
        </Link>
        <Link
          href="/"
          className="rounded-[var(--radius-btn)] border border-line-strong px-5 py-3 text-sm font-semibold text-ink hover:bg-surface-alt"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
