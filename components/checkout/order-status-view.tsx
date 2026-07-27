import Link from 'next/link';

import { ClearCartOnSuccess } from '@/components/cart/clear-cart-on-success';
import { RetryPaymentButton } from '@/components/checkout/retry-payment-button';
import { Money } from '@/components/ui/money';
import type { OrderView } from '@/lib/orders/get-order-by-token';
import { etaFor } from '@/lib/pricing';
import type { Service } from '@/types/cart';

/**
 * Server-rendered confirmation, read from the database rather than
 * `localStorage`, so it survives a new device, a cleared browser, or a shared
 * link.
 */
export function OrderStatusView({ order, token }: { order: OrderView; token: string }) {
  // `paid` and `unpaid` are both settled outcomes for the customer: the order is
  // placed. `unpaid` simply means it is owed at the counter.
  const confirmed = order.paymentStatus === 'paid' || order.paymentStatus === 'unpaid';
  const failed = order.paymentStatus === 'failed';

  return (
    <div className="mx-auto max-w-lg text-center">
      {confirmed ? <ClearCartOnSuccess /> : null}

      <p className="text-sm font-medium uppercase tracking-widest text-brand">
        {confirmed ? 'Order confirmed' : failed ? 'Payment not completed' : 'Confirming payment'}
      </p>

      <h1 className="mt-3 text-4xl">
        {confirmed
          ? 'Thanks — we’re on it!'
          : failed
            ? 'We couldn’t take payment'
            : 'Just a moment…'}
      </h1>

      <p className="mt-2 text-muted">
        {confirmed ? (
          <>
            Your order <span className="font-semibold text-ink">{order.reference}</span> has
            been placed.
          </>
        ) : failed ? (
          <>
            Order <span className="font-semibold text-ink">{order.reference}</span> is not
            paid yet. Please speak to our staff.
          </>
        ) : (
          <>We’re confirming payment for {order.reference}. Refresh in a moment.</>
        )}
      </p>

      <dl className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-x-6 gap-y-3 rounded-[var(--radius-card)] border border-line p-6 text-left text-sm">
        <dt className="text-muted">Order</dt>
        <dd className="text-right font-medium">{order.reference}</dd>

        <dt className="text-muted">
          {order.service === 'delivery' ? 'Delivery' : 'Pickup'} ETA
        </dt>
        <dd className="text-right font-medium">{etaFor(order.service as Service)}</dd>

        <dt className="text-muted">Total</dt>
        <dd className="text-right font-medium">
          <Money value={order.total} />
        </dd>

        {order.customerName ? (
          <>
            <dt className="text-muted">Name</dt>
            <dd className="text-right font-medium">{order.customerName}</dd>
          </>
        ) : null}

        <dt className="text-muted">Payment</dt>
        <dd className="text-right font-medium">
          {order.paymentStatus === 'paid' ? 'Paid' : 'Pay on collection'}
        </dd>
      </dl>

      <ul className="mx-auto mt-4 max-w-sm rounded-[var(--radius-card)] border border-line p-6 text-left text-sm">
        {order.items.map((item, index) => (
          <li key={`${item.itemName}-${index}`} className="flex gap-3 py-2">
            <span className="text-muted">{item.quantity}×</span>
            <span className="min-w-0 flex-1">
              {item.itemName}
              {item.options.length ? (
                <span className="block text-xs text-muted">{item.options.join(' · ')}</span>
              ) : null}
              {item.notes ? (
                <span className="block text-xs italic text-muted">“{item.notes}”</span>
              ) : null}
            </span>
            <Money value={item.lineTotal} className="font-medium" />
          </li>
        ))}
      </ul>

      {failed ? (
        <div className="mt-6 flex justify-center">
          <RetryPaymentButton token={token} />
        </div>
      ) : null}

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
    </div>
  );
}
