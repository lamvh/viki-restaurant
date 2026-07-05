import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CheckoutView } from './checkout-view';
import { useCartStore } from '@/store/cart-store';
import type { CartLine } from '@/types/cart';

// Mock the router so we can assert on navigation.
const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

function line(over: Partial<CartLine> = {}): CartLine {
  return { key: 'phobo', id: 'phobo', name: 'Phở Bò', unit: 16, qty: 1, labels: [], notes: '', ...over };
}

function reset(state: Partial<ReturnType<typeof useCartStore.getState>>) {
  localStorage.clear();
  useCartStore.setState({
    service: 'pickup',
    cart: [],
    cartOpen: false,
    modalItemId: null,
    lastOrder: null,
    justPlaced: false,
    ...state,
  });
}

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
});

describe('CheckoutView guard', () => {
  it('redirects a stale empty-cart visit to /menu', async () => {
    reset({ cart: [], justPlaced: false });
    render(<CheckoutView />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/menu'));
  });

  it('does NOT redirect to /menu during the just-placed transition', async () => {
    // After placeOrder the cart is empty but justPlaced is true — the user is on
    // their way to /order/confirmed and must not be bounced to /menu.
    reset({ cart: [], justPlaced: true });
    render(<CheckoutView />);
    // Let hydration + guard effects settle.
    await waitFor(() => expect(useCartStore.getState().justPlaced).toBe(true));
    expect(replace).not.toHaveBeenCalledWith('/menu');
  });

  it('renders the checkout screen when the cart has items', async () => {
    reset({ cart: [line({ qty: 1 })] });
    render(<CheckoutView />);
    expect(await screen.findByRole('heading', { name: /checkout/i })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
