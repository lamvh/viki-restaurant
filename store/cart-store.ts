// Zustand cart/service/UI store (design spec §6). Transient item-modal state
// (selected options, qty, notes) lives locally in the modal and commits here
// via addLine. `service` and `cart` persist to localStorage.
//
// Order placement is NOT here. Orders are created server-side by
// `app/(site)/checkout/actions.ts` so the total is computed from the menu rather
// than the browser, and the confirmation screen reads from the database.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { totals, type Totals } from '@/lib/pricing';
import type { CartLine, Service } from '@/types/cart';

type CartState = {
  service: Service;
  cart: CartLine[];
  cartOpen: boolean;
  /** Id of the menu item whose customisation modal is open, or null. */
  modalItemId: string | null;

  setService: (service: Service) => void;
  addLine: (line: CartLine) => void;
  incLine: (key: string) => void;
  decLine: (key: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  openItem: (id: string) => void;
  closeItem: () => void;

  count: () => number;
  totals: () => Totals;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      service: 'pickup',
      cart: [],
      cartOpen: false,
      modalItemId: null,

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
          cart: state.cart.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)),
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

      count: () => get().cart.reduce((sum, l) => sum + l.qty, 0),
      totals: () => totals(get().cart, get().service),
    }),
    {
      name: 'viki-cart',
      version: 1,
      // v0 lines predate `choiceIds`, so the server cannot reprice them. Dropping
      // one in-progress cart once beats shipping a parser that guesses.
      migrate: (state, version) =>
        version === 0 ? { ...(state as object), cart: [] } : state,
      partialize: (state) => ({
        service: state.service,
        cart: state.cart,
      }),
    },
  ),
);
