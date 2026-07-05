import type { Metadata } from 'next';
import { OrderConfirmedView } from '@/components/checkout/order-confirmed-view';

// Transactional page — per-user state, no marketing value → keep out of search.
export const metadata: Metadata = {
  title: 'Order Confirmed',
  robots: { index: false, follow: false },
};

export default function OrderConfirmedPage() {
  return <OrderConfirmedView />;
}
