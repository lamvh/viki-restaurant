import type { Metadata } from 'next';

import { OrderRow } from '@/components/admin/orders/order-row';
import { listOrders } from '@/lib/db/list-orders';

export const metadata: Metadata = { title: 'Orders' };

// Payment state changes from the terminal, so never serve a cached list.
export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const orders = await listOrders();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-ink/50">
          Charge an order to the card terminal, or mark it paid in cash.
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-8 text-center text-sm text-ink/50">
          No orders yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface px-5">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="py-3 pr-4 font-medium">Order</th>
                <th className="py-3 pr-4 font-medium">Customer</th>
                <th className="py-3 pr-4 font-medium">Service</th>
                <th className="py-3 pr-4 font-medium">Total</th>
                <th className="py-3 pr-4 font-medium">Payment</th>
                <th className="py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
