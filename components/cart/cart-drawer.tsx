'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cart-store';
import { totals } from '@/lib/pricing';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { CartLine } from './cart-line';
import { OrderSummary } from './order-summary';
import { ServiceToggle } from '@/components/layout/service-toggle';

/** Global cart-drawer mount. Renders nothing unless the cart is open. */
export function CartDrawer() {
  const cartOpen = useCartStore((s) => s.cartOpen);
  return cartOpen ? <CartDrawerPanel /> : null;
}

function CartDrawerPanel() {
  const cart = useCartStore((s) => s.cart);
  const service = useCartStore((s) => s.service);
  const closeCart = useCartStore((s) => s.closeCart);
  const panelRef = useFocusTrap<HTMLDivElement>(closeCart);

  const t = totals(cart, service);
  const empty = cart.length === 0;
  const canCheckout = !empty && !t.belowDeliveryMin;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Your order">
      <div className="absolute inset-0 bg-ink/40" onClick={closeCart} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-surface shadow-xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-xl">Your order</h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="rounded-[var(--radius-btn)] px-2 py-1 text-muted hover:bg-surface-alt"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <ServiceToggle className="mb-4 w-full justify-center" />
          {empty ? (
            <div className="py-16 text-center">
              <p className="text-muted">Your cart is empty.</p>
              <Link
                href="/menu"
                onClick={closeCart}
                className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
              >
                Browse the menu →
              </Link>
            </div>
          ) : (
            <div>
              {cart.map((line) => (
                <CartLine key={line.key} line={line} />
              ))}
            </div>
          )}
        </div>

        {!empty ? (
          <div className="border-t border-line p-4">
            <OrderSummary />
            {canCheckout ? (
              <Link
                href="/checkout"
                onClick={closeCart}
                className="mt-4 block rounded-[var(--radius-btn)] bg-brand px-4 py-3 text-center text-sm font-semibold text-surface"
              >
                Go to checkout
              </Link>
            ) : (
              // Below the delivery minimum — a real disabled control (not a still
              // keyboard-activatable link) so it can't be reached or triggered.
              <button
                type="button"
                disabled
                className="mt-4 block w-full cursor-not-allowed rounded-[var(--radius-btn)] bg-muted px-4 py-3 text-center text-sm font-semibold text-surface opacity-60"
              >
                Go to checkout
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
