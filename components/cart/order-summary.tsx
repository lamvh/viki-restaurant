'use client';

import { useCartStore } from '@/store/cart-store';
import { totals, DELIVERY_MIN } from '@/lib/pricing';
import { money } from '@/lib/format';
import { Money } from '@/components/ui/money';

/**
 * Live order totals. Selects cart + service (stable refs) and computes totals in
 * render via the pure pricing module — avoids a store selector returning a fresh
 * object each render.
 */
export function OrderSummary() {
  const cart = useCartStore((s) => s.cart);
  const service = useCartStore((s) => s.service);
  const t = totals(cart, service);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <Row label="Subtotal">
        <Money value={t.subtotal} />
      </Row>
      {t.hasDiscount ? (
        <Row label="Discount (10%)">
          <span className="text-brand">−<Money value={t.discount} /></span>
        </Row>
      ) : null}
      {t.fee > 0 ? (
        <Row label="Delivery fee">
          <Money value={t.fee} />
        </Row>
      ) : null}
      <div className="my-1 border-t border-line" />
      <Row label="Total">
        <Money value={t.total} className="text-lg font-semibold" />
      </Row>
      <p className="text-xs text-muted">You&apos;ll earn {t.points} points on this order.</p>
      {t.belowDeliveryMin ? (
        <p className="text-xs font-medium text-brand">
          Add {money(DELIVERY_MIN - t.subtotal)} more to meet the {money(DELIVERY_MIN)}{' '}
          delivery minimum.
        </p>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span>{children}</span>
    </div>
  );
}
