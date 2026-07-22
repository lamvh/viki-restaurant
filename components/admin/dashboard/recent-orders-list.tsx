import { Money } from '@/components/ui/money';
import type { RecentOrder } from '@/lib/db/get-dashboard-metrics';

function statusClass(status: RecentOrder['status']): string {
  switch (status) {
    case 'new':
    case 'preparing':
      return 'bg-brand/10 text-brand';
    case 'cancelled':
      return 'bg-surface-alt text-ink/50';
    default:
      return 'bg-surface-alt text-ink/70';
  }
}

/** Recent orders table. Renders an empty-state when there are none yet. */
export function RecentOrdersList({ orders }: { orders: RecentOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-5 py-10 text-center text-sm text-ink/50">
        No orders yet. Orders placed on the public site will appear here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink/50">
          <tr>
            <th className="px-5 py-3 font-medium">Service</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3 capitalize">{order.service}</td>
              <td className="px-5 py-3">
                <span
                  className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-xs capitalize ${statusClass(order.status)}`}
                >
                  {order.status}
                </span>
              </td>
              <td className="px-5 py-3 text-right">
                <Money value={order.total} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
