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
  return {
    key: 'phobo',
    id: 'phobo',
    name: 'Phở Bò',
    unit: 16,
    qty: 1,
    labels: [],
    notes: '',
    choiceIds: [],
    ...over,
  };
}

function reset(state: Partial<ReturnType<typeof useCartStore.getState>>) {
  localStorage.clear();
  useCartStore.setState({
    service: 'pickup',
    cart: [],
    cartOpen: false,
    modalItemId: null,
    ...state,
  });
}

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
});

describe('CheckoutView guard', () => {
  it('redirects a stale empty-cart visit to /menu', async () => {
    reset({ cart: [] });
    render(<CheckoutView cardEnabled={false} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/menu'));
  });

  it('keeps the cart intact while the checkout screen is open', async () => {
    // The cart is cleared on the confirmation page, never at submit — a failed
    // payment must return the customer to an intact cart.
    reset({ cart: [line({ qty: 2 })] });
    render(<CheckoutView cardEnabled={false} />);
    await screen.findByRole('heading', { name: /checkout/i });
    expect(useCartStore.getState().cart).toHaveLength(1);
    expect(useCartStore.getState().cart[0].qty).toBe(2);
  });

  it('renders the checkout screen when the cart has items', async () => {
    reset({ cart: [line({ qty: 1 })] });
    render(<CheckoutView cardEnabled={false} />);
    expect(await screen.findByRole('heading', { name: /checkout/i })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
