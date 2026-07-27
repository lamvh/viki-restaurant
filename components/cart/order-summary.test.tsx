import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderSummary } from './order-summary';
import { useCartStore } from '@/store/cart-store';
import type { CartLine } from '@/types/cart';

function line(unit: number, qty = 1, key = `k${unit}`): CartLine {
  return { key, id: 'x', name: 'X', unit, qty, labels: [], notes: '', choiceIds: [] };
}

function setup(cart: CartLine[], service: 'pickup' | 'delivery' = 'pickup') {
  localStorage.clear();
  useCartStore.setState({
    service,
    cart,
    cartOpen: false,
    modalItemId: null,
  });
}

beforeEach(() => setup([]));

describe('OrderSummary', () => {
  it('shows subtotal and total with no discount below $30', () => {
    setup([line(20)]);
    render(<OrderSummary />);
    expect(screen.getByText('Subtotal').parentElement).toHaveTextContent('$20.00');
    expect(screen.queryByText(/discount/i)).not.toBeInTheDocument();
    expect(screen.getByText('Total').parentElement).toHaveTextContent('$20.00');
  });

  it('shows the 10% discount at $30 and points on the discounted subtotal', () => {
    setup([line(30)]);
    render(<OrderSummary />);
    expect(screen.getByText(/discount/i)).toBeInTheDocument();
    expect(screen.getByText('Total').parentElement).toHaveTextContent('$27.00');
    expect(screen.getByText(/270 points/i)).toBeInTheDocument();
  });

  it('shows the delivery fee and delivery-minimum note appropriately', () => {
    setup([line(20)], 'delivery');
    render(<OrderSummary />);
    expect(screen.getByText(/delivery fee/i)).toBeInTheDocument();
    expect(screen.getByText('Total').parentElement).toHaveTextContent('$24.00');
  });

  it('warns when below the delivery minimum', () => {
    setup([line(4)], 'delivery');
    render(<OrderSummary />);
    expect(screen.getByText(/delivery minimum/i)).toBeInTheDocument();
  });
});
