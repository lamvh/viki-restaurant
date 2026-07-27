import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OrderStatusView } from '@/components/checkout/order-status-view';
import { getOrderByToken } from '@/lib/orders/get-order-by-token';

// Token-addressed and per-customer. `noindex` matters here: the token is the
// only thing protecting the page, so it must never reach a search index.
export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getOrderByToken(token);

  if (!order) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <OrderStatusView order={order} token={token} />
    </main>
  );
}
