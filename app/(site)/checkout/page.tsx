import type { Metadata } from 'next';

import { CheckoutView } from '@/components/checkout/checkout-view';
import { isOnlinePaymentConfigured } from '@/lib/windcave/env';

// Transactional page — no marketing value + per-user state, so keep it out of search.
export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  // Card payment only appears when the gateway is actually configured, so an
  // unconfigured deploy cannot offer a button that always fails.
  return <CheckoutView cardEnabled={isOnlinePaymentConfigured()} />;
}
