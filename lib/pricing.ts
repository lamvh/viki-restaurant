// Pure pricing logic — no React, no store. Ported verbatim from the source
// `totals()` (design spec §5) and locked by unit tests. UI must consume this
// module rather than re-deriving totals.

import type { CartLine, Service } from '@/types/cart';

/** Discount kicks in once subtotal reaches this amount. */
export const DISCOUNT_THRESHOLD = 30;
/** Discount rate applied at/above the threshold. */
export const DISCOUNT_RATE = 0.1;
/** Flat delivery fee (only when delivering a non-empty cart). */
export const DELIVERY_FEE = 4;
/** Minimum subtotal required to check out on delivery. */
export const DELIVERY_MIN = 5;
/** Loyalty points earned per dollar of the discounted subtotal. */
export const POINTS_PER_DOLLAR = 10;

export type Totals = {
  subtotal: number;
  hasDiscount: boolean;
  discount: number;
  fee: number;
  total: number;
  points: number;
  /** True when delivery is selected but subtotal is below the delivery minimum. */
  belowDeliveryMin: boolean;
};

export function totals(cart: CartLine[], service: Service): Totals {
  const subtotal = cart.reduce((sum, line) => sum + line.unit * line.qty, 0);
  const hasDiscount = subtotal >= DISCOUNT_THRESHOLD;
  const discount = hasDiscount ? subtotal * DISCOUNT_RATE : 0;
  const fee = service === 'delivery' && subtotal > 0 ? DELIVERY_FEE : 0;
  const total = subtotal - discount + fee;
  const points = Math.round((subtotal - discount) * POINTS_PER_DOLLAR);
  const belowDeliveryMin =
    service === 'delivery' && subtotal > 0 && subtotal < DELIVERY_MIN;

  return { subtotal, hasDiscount, discount, fee, total, points, belowDeliveryMin };
}

/** Estimated fulfilment window per service (design spec §5). */
export function etaFor(service: Service): string {
  return service === 'delivery' ? '30–40 min' : '15–20 min';
}
