'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useHydrated } from '@/lib/use-hydrated';
import { CheckoutForm } from './checkout-form';
import { CartLine } from '@/components/cart/cart-line';
import { OrderSummary } from '@/components/cart/order-summary';

/** Client checkout screen: redirects to /menu when the cart is empty. */
export function CheckoutView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const cart = useCartStore((s) => s.cart);
  const justPlaced = useCartStore((s) => s.justPlaced);

  useEffect(() => {
    // Don't bounce to /menu during the just-placed transition to the confirmation
    // screen — only redirect a genuinely stale empty-cart visit.
    if (hydrated && cart.length === 0 && !justPlaced) router.replace('/menu');
  }, [hydrated, cart.length, justPlaced, router]);

  // Avoid flashing an empty checkout before the guard resolves / hydration.
  if (!hydrated || cart.length === 0) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-4xl">Checkout</h1>
      <div className="grid gap-10 md:grid-cols-[1fr_20rem]">
        <CheckoutForm />
        <aside className="h-fit rounded-[var(--radius-card)] border border-line bg-surface-alt p-4 md:sticky md:top-24">
          <h2 className="mb-3 text-lg">Order summary</h2>
          <div className="mb-3">
            {cart.map((line) => (
              <CartLine key={line.key} line={line} />
            ))}
          </div>
          <OrderSummary />
        </aside>
      </div>
    </main>
  );
}
