import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartDrawer } from './cart-drawer';
import { useCartStore } from '@/store/cart-store';
import type { CartLine } from '@/types/cart';

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

function reset(cart: CartLine[], extra: Partial<ReturnType<typeof useCartStore.getState>> = {}) {
  localStorage.clear();
  useCartStore.setState({
    service: 'pickup',
    cart,
    cartOpen: true,
    modalItemId: null,
    ...extra,
  });
}

beforeEach(() => reset([]));

describe('CartDrawer', () => {
  it('renders nothing when closed', () => {
    useCartStore.setState({ cartOpen: false });
    const { container } = render(<CartDrawer />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an empty state with no lines', () => {
    render(<CartDrawer />);
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it('lists lines and shows the total', () => {
    reset([line({ unit: 12, qty: 2 })]); // $24 — below the $30 discount threshold
    render(<CartDrawer />);
    expect(screen.getByText('Phở Bò')).toBeInTheDocument();
    expect(screen.getByText('Total').parentElement).toHaveTextContent('$24.00');
  });

  it('increments a line quantity via the control', async () => {
    const user = userEvent.setup();
    reset([line({ qty: 1 })]);
    render(<CartDrawer />);
    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    expect(useCartStore.getState().cart[0].qty).toBe(2);
  });

  it('disables checkout below the delivery minimum', () => {
    reset([line({ unit: 4, qty: 1 })], { service: 'delivery' }); // $4 < $5 min
    render(<CartDrawer />);
    const cta = screen.getByRole('button', { name: /go to checkout/i });
    expect(cta).toBeDisabled();
  });
});
