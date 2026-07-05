import type { Metadata } from 'next';
import { CheckoutView } from '@/components/checkout/checkout-view';

// Transactional page — no marketing value + per-user state, so keep it out of search.
export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
