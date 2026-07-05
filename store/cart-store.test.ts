import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '@/store/cart-store';
import type { CartLine } from '@/types/cart';

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    key: 'phobo|regular',
    id: 'phobo',
    name: 'Phở Bò',
    unit: 16,
    qty: 1,
    labels: [],
    notes: '',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({
    service: 'pickup',
    cart: [],
    cartOpen: false,
    lastOrder: null,
  });
});

describe('cart lines', () => {
  it('adds a new line', () => {
    useCartStore.getState().addLine(line());
    expect(useCartStore.getState().cart).toHaveLength(1);
  });

  it('merges quantity when a line with the same key is added', () => {
    const { addLine } = useCartStore.getState();
    addLine(line({ qty: 1 }));
    addLine(line({ qty: 2 }));
    const cart = useCartStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].qty).toBe(3);
  });

  it('keeps differently-customised lines separate', () => {
    const { addLine } = useCartStore.getState();
    addLine(line({ key: 'phobo|regular' }));
    addLine(line({ key: 'phobo|large', unit: 19 }));
    expect(useCartStore.getState().cart).toHaveLength(2);
  });

  it('increments and decrements a line', () => {
    const s = useCartStore.getState();
    s.addLine(line({ qty: 1 }));
    s.incLine('phobo|regular');
    expect(useCartStore.getState().cart[0].qty).toBe(2);
    s.decLine('phobo|regular');
    expect(useCartStore.getState().cart[0].qty).toBe(1);
  });

  it('removes a line when its quantity drops to zero', () => {
    const s = useCartStore.getState();
    s.addLine(line({ qty: 1 }));
    s.decLine('phobo|regular');
    expect(useCartStore.getState().cart).toHaveLength(0);
  });

  it('counts total quantity across lines', () => {
    const s = useCartStore.getState();
    s.addLine(line({ key: 'a', qty: 2 }));
    s.addLine(line({ key: 'b', qty: 3 }));
    expect(useCartStore.getState().count()).toBe(5);
  });
});

describe('service + totals', () => {
  it('switches service and reflects it in totals', () => {
    const s = useCartStore.getState();
    s.addLine(line({ unit: 20, qty: 1 }));
    expect(useCartStore.getState().totals().fee).toBe(0);
    s.setService('delivery');
    expect(useCartStore.getState().totals().fee).toBe(4);
  });
});

describe('placeOrder', () => {
  it('returns null and sets no order for an empty cart', () => {
    const order = useCartStore.getState().placeOrder();
    expect(order).toBeNull();
    expect(useCartStore.getState().lastOrder).toBeNull();
  });

  it('builds an order, clears the cart, and stores lastOrder', () => {
    const s = useCartStore.getState();
    s.setService('delivery');
    s.addLine(line({ unit: 40, qty: 1 })); // subtotal 40, discount 4, fee 4 → total 40
    const order = useCartStore.getState().placeOrder();

    expect(order).not.toBeNull();
    expect(order!.number).toMatch(/^VK-\d{4}$/);
    expect(order!.service).toBe('delivery');
    expect(order!.eta).toBe('30–40 min');
    expect(order!.total).toBeCloseTo(40, 5);
    expect(order!.points).toBe(360); // (40 - 4) * 10

    const state = useCartStore.getState();
    expect(state.cart).toHaveLength(0);
    expect(state.cartOpen).toBe(false);
    expect(state.lastOrder).toEqual(order);
  });
});

describe('justPlaced transition', () => {
  it('is set by placeOrder so the checkout guard can defer the /menu redirect', () => {
    const s = useCartStore.getState();
    s.addLine(line({ qty: 1 }));
    expect(useCartStore.getState().justPlaced).toBe(false);
    useCartStore.getState().placeOrder();
    expect(useCartStore.getState().justPlaced).toBe(true);
  });

  it('is cleared when a new order starts (addLine)', () => {
    const s = useCartStore.getState();
    s.addLine(line({ qty: 1 }));
    s.placeOrder();
    expect(useCartStore.getState().justPlaced).toBe(true);
    useCartStore.getState().addLine(line({ qty: 1 }));
    expect(useCartStore.getState().justPlaced).toBe(false);
  });

  it('is cleared by clearJustPlaced (on confirmation mount)', () => {
    const s = useCartStore.getState();
    s.addLine(line({ qty: 1 }));
    s.placeOrder();
    useCartStore.getState().clearJustPlaced();
    expect(useCartStore.getState().justPlaced).toBe(false);
  });

  it('does not persist justPlaced to localStorage', () => {
    const s = useCartStore.getState();
    s.addLine(line({ qty: 1 }));
    s.placeOrder();
    const persisted = JSON.parse(localStorage.getItem('viki-cart') ?? '{}');
    expect(persisted.state?.justPlaced).toBeUndefined();
  });
});
