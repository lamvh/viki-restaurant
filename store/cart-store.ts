// Zustand cart/service/UI store (design spec §6). Transient item-modal state
// (selected options, qty, notes) lives locally in the modal and commits here
// via addLine. `service`, `cart`, and `lastOrder` persist to localStorage.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, Order, Service } from '@/types/cart';
import { totals, etaFor, type Totals } from '@/lib/pricing';

type CartState = {
  service: Service;
  cart: CartLine[];
  cartOpen: boolean;
  lastOrder: Order | null;

  setService: (service: Service) => void;
  addLine: (line: CartLine) => void;
  incLine: (key: string) => void;
  decLine: (key: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  placeOrder: () => Order | null;

  count: () => number;
  totals: () => Totals;
};

/** VK-#### mock order number (design spec §6). */
function nextOrderNumber(): string {
  return `VK-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      service: 'pickup',
      cart: [],
      cartOpen: false,
      lastOrder: null,

      setService: (service) => set({ service }),

      addLine: (line) =>
        set((state) => {
          const existing = state.cart.find((l) => l.key === line.key);
          if (existing) {
            // Same customisation → merge quantities rather than duplicate.
            return {
              cart: state.cart.map((l) =>
                l.key === line.key ? { ...l, qty: l.qty + line.qty } : l,
              ),
            };
          }
          return { cart: [...state.cart, line] };
        }),

      incLine: (key) =>
        set((state) => ({
          cart: state.cart.map((l) =>
            l.key === key ? { ...l, qty: l.qty + 1 } : l,
          ),
        })),

      decLine: (key) =>
        set((state) => ({
          // Removes the line when qty would drop to 0.
          cart: state.cart
            .map((l) => (l.key === key ? { ...l, qty: l.qty - 1 } : l))
            .filter((l) => l.qty > 0),
        })),

      clearCart: () => set({ cart: [] }),
      openCart: () => set({ cartOpen: true }),
      closeCart: () => set({ cartOpen: false }),

      placeOrder: () => {
        const { cart, service } = get();
        if (cart.length === 0) return null;

        const t = totals(cart, service);
        const order: Order = {
          number: nextOrderNumber(),
          total: t.total,
          points: t.points,
          service,
          eta: etaFor(service),
          placedAt: Date.now(),
        };
        set({ cart: [], cartOpen: false, lastOrder: order });
        return order;
      },

      count: () => get().cart.reduce((sum, l) => sum + l.qty, 0),
      totals: () => totals(get().cart, get().service),
    }),
    {
      name: 'viki-cart',
      partialize: (state) => ({
        service: state.service,
        cart: state.cart,
        lastOrder: state.lastOrder,
      }),
    },
  ),
);
