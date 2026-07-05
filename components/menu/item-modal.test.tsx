import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemModal } from './item-modal';
import { useCartStore } from '@/store/cart-store';

function reset() {
  localStorage.clear();
  useCartStore.setState({
    service: 'pickup',
    cart: [],
    cartOpen: false,
    modalItemId: null,
    lastOrder: null,
    justPlaced: false,
  });
}

beforeEach(reset);

const addButton = () => screen.getByRole('button', { name: /add to order/i });

describe('ItemModal', () => {
  it('renders nothing when no item is open', () => {
    const { container } = render(<ItemModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('updates the line total as options change and commits the line to the store', async () => {
    const user = userEvent.setup();
    useCartStore.getState().openItem('phobo'); // base $16
    render(<ItemModal />);

    // Default: Regular size (+0), no add-ons.
    expect(addButton()).toHaveTextContent('$16.00');

    await user.click(screen.getByLabelText(/Large/)); // +3 (label includes price)
    expect(addButton()).toHaveTextContent('$19.00');

    await user.click(screen.getByLabelText(/Extra brisket/)); // +4
    expect(addButton()).toHaveTextContent('$23.00');

    await user.click(addButton());

    const state = useCartStore.getState();
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].unit).toBe(23);
    expect(state.cart[0].labels).toEqual(['Large', 'Extra brisket']);
    // Closes the modal and opens the cart after adding.
    expect(state.modalItemId).toBeNull();
    expect(state.cartOpen).toBe(true);
  });

  it('multiplies the total by quantity', async () => {
    const user = userEvent.setup();
    useCartStore.getState().openItem('phobo');
    render(<ItemModal />);

    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    expect(addButton()).toHaveTextContent('$32.00'); // 16 × 2
  });
});
