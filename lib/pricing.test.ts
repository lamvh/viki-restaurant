import { describe, it, expect } from 'vitest';
import { totals, etaFor } from '@/lib/pricing';
import type { CartLine } from '@/types/cart';

function line(unit: number, qty = 1, key = `k${unit}-${qty}`): CartLine {
  return { key, id: 'x', name: 'X', unit, qty, labels: [], notes: '' };
}

describe('totals', () => {
  it('returns zeros for an empty cart', () => {
    const t = totals([], 'pickup');
    expect(t).toMatchObject({
      subtotal: 0,
      hasDiscount: false,
      discount: 0,
      fee: 0,
      total: 0,
      points: 0,
      belowDeliveryMin: false,
    });
  });

  it('applies no discount below the $30 threshold', () => {
    const t = totals([line(29.99)], 'pickup');
    expect(t.hasDiscount).toBe(false);
    expect(t.discount).toBe(0);
  });

  it('applies a 10% discount at exactly $30 (boundary inclusive)', () => {
    const t = totals([line(30)], 'pickup');
    expect(t.hasDiscount).toBe(true);
    expect(t.discount).toBeCloseTo(3, 5);
    expect(t.total).toBeCloseTo(27, 5);
  });

  it('sums unit × qty across lines for the subtotal', () => {
    const t = totals([line(10, 2), line(5, 1)], 'pickup');
    expect(t.subtotal).toBe(25);
  });

  it('charges the delivery fee only on delivery with a non-empty cart', () => {
    expect(totals([line(20)], 'pickup').fee).toBe(0);
    expect(totals([], 'delivery').fee).toBe(0);
    expect(totals([line(20)], 'delivery').fee).toBe(4);
  });

  it('flags belowDeliveryMin only for delivery with 0 < subtotal < 5', () => {
    expect(totals([line(4)], 'delivery').belowDeliveryMin).toBe(true);
    expect(totals([line(5)], 'delivery').belowDeliveryMin).toBe(false);
    expect(totals([line(4)], 'pickup').belowDeliveryMin).toBe(false);
    expect(totals([], 'delivery').belowDeliveryMin).toBe(false);
  });

  it('earns points on the discounted subtotal, rounded', () => {
    // 12.34 * 10 = 123.4 → 123 (no discount under $30)
    expect(totals([line(12.34)], 'pickup').points).toBe(123);
    // (30 - 3) * 10 = 270
    expect(totals([line(30)], 'pickup').points).toBe(270);
  });

  it('computes total as subtotal - discount + fee', () => {
    // subtotal 40, discount 4, delivery fee 4 → 40
    const t = totals([line(40)], 'delivery');
    expect(t.total).toBeCloseTo(40, 5);
  });
});

describe('etaFor', () => {
  it('gives a shorter window for pickup than delivery', () => {
    expect(etaFor('pickup')).toBe('15–20 min');
    expect(etaFor('delivery')).toBe('30–40 min');
  });
});
