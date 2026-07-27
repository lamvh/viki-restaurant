'use client';

import { useEffect } from 'react';

import { useCartStore } from '@/store/cart-store';

/**
 * Clears the cart once — and only once — an order is confirmed.
 *
 * Deliberately not done at submit: a failed payment must return the customer to
 * an intact cart. The old mock cleared optimistically, which was harmless for a
 * fake order and hostile for a real one.
 */
export function ClearCartOnSuccess() {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return null;
}
