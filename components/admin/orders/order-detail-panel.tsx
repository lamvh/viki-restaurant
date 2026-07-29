import { money } from '@/lib/format';
import { serviceBlockBg, serviceMeta } from '@/lib/admin/status-meta';
import type { StaffOrderView } from '@/lib/orders/get-order-for-staff';

import { ElapsedTime } from './elapsed-time';
import { OrderActions } from './order-actions';
import { StatusBadge } from './status-badge';

/** Where the food is going — the panel's tinted service block. */
function serviceLines(order: StaffOrderView): { primary: string; secondary: string } {
  if (order.service === 'delivery') {
    return {
      primary: order.address ?? 'No address recorded',
      secondary: order.customerPhone ?? 'No phone recorded',
    };
  }
  return {
    primary: 'Collecting from the counter',
    secondary: order.customerPhone ?? 'No phone recorded',
  };
}

/** Full detail for the selected order, plus the actions available on it. */
export function OrderDetailPanel({
  order,
  orderId,
}: {
  order: StaffOrderView;
  orderId: string;
}) {
  const service = serviceMeta(order.service);
  const lines = serviceLines(order);

  return (
    <div className="overflow-hidden rounded-[16px] border border-admin-line bg-admin-card">
      <div className="border-b border-admin-line px-5 py-[18px]">
        <div className="mb-2 flex flex-wrap items-center gap-2.5">
          <span className="text-base font-extrabold">{order.reference}</span>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-[13px] text-admin-muted">
          {order.customerName ?? 'Counter sale'} · <ElapsedTime createdAt={order.createdAt} /> ·{' '}
          {order.paymentStatus === 'paid'
            ? `Paid · ${order.paymentMethod}`
            : `Payment ${order.paymentStatus}`}
        </p>
      </div>

      <div
        className="border-b border-admin-line px-5 py-4"
        style={{ backgroundColor: serviceBlockBg(order.service) }}
      >
        <p
          className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[1px]"
          style={{ color: service.fg }}
        >
          {service.label}
        </p>
        <p className="text-sm font-semibold leading-[1.4]">{lines.primary}</p>
        <p className="mt-0.5 text-[13px] text-admin-muted">{lines.secondary}</p>
      </div>

      <div className="border-b border-admin-line px-5 py-4">
        {order.items.map((item, index) => (
          <div key={`${item.itemName}-${index}`} className="flex gap-2.5 py-[7px] text-sm">
            <span className="font-bold text-brand">{item.quantity}×</span>
            <div className="flex-1">
              <p className="font-semibold">{item.itemName}</p>
              {item.options.length > 0 ? (
                <p className="text-xs text-admin-faint">{item.options.join(' · ')}</p>
              ) : null}
              {item.notes ? <p className="text-xs text-admin-faint">{item.notes}</p> : null}
            </div>
            <span className="text-sm text-admin-muted">{money(item.lineTotal)}</span>
          </div>
        ))}

        <div className="mt-2.5 flex justify-between border-t border-admin-line pt-3">
          <span className="font-bold">Total</span>
          <span className="font-display text-[22px]">{money(order.total)}</span>
        </div>
      </div>

      <div className="px-5 py-4">
        <OrderActions
          orderId={orderId}
          reference={order.reference}
          status={order.status}
          paymentStatus={order.paymentStatus}
          hitTxnRef={order.hitTxnRef}
        />
      </div>
    </div>
  );
}
