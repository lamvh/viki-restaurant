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
  /** Id of the menu item whose customisation modal is open, or null. */
  modalItemId: string | null;
  lastOrder: Order | null;
  /**
   * Transient (not persisted) flag: true between placing an order and landing on
   * the confirmation screen. Lets the checkout guard tell a just-placed empty cart
   * (navigate to confirmation) from a stale empty cart (redirect to /menu).
   */
  justPlaced: boolean;

  setService: (service: Service) => void;
  addLine: (line: CartLine) => void;
  incLine: (key: string) => void;
  decLine: (key: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  openItem: (id: string) => void;
  closeItem: () => void;
  placeOrder: () => Order | null;
  clearJustPlaced: () => void;

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
      modalItemId: null,
      lastOrder: null,
      justPlaced: false,

      setService: (service) => set({ service }),

      addLine: (line) =>
        set((state) => {
          // Adding to the cart starts a new order, so clear any just-placed flag.
          const existing = state.cart.find((l) => l.key === line.key);
          if (existing) {
            // Same customisation → merge quantities rather than duplicate.
            return {
              justPlaced: false,
              cart: state.cart.map((l) =>
                l.key === line.key ? { ...l, qty: l.qty + line.qty } : l,
              ),
            };
          }
          return { justPlaced: false, cart: [...state.cart, line] };
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
      openItem: (id) => set({ modalItemId: id }),
      closeItem: () => set({ modalItemId: null }),

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
        set({ cart: [], cartOpen: false, lastOrder: order, justPlaced: true });
        return order;
      },

      clearJustPlaced: () => set({ justPlaced: false }),

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
