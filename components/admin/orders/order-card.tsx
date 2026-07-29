import Link from 'next/link';

import { money } from '@/lib/format';
import type { StaffOrder } from '@/lib/db/list-orders';

import { ElapsedTime } from './elapsed-time';
import { ServiceBadge, StatusBadge } from './status-badge';

/**
 * One order in the queue list.
 *
 * Selection is a link, not a click handler: the detail panel is server-rendered
 * from `?order=`, so the whole view is shareable, reloadable and free of a
 * client fetch.
 */
export function OrderCard({
  order,
  selected,
  href,
}: {
  order: StaffOrder;
  selected: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={selected ? 'true' : undefined}
      className={`block rounded-[14px] border bg-admin-card p-4 transition-colors ${
        selected
          ? 'border-admin-ink shadow-[0_0_0_1px_var(--color-admin-ink)]'
          : 'border-admin-line hover:border-admin-ink/30'
      }`}
    >
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
        <span className="text-[14.5px] font-extrabold tracking-[0.3px]">{order.reference}</span>
        <ServiceBadge service={order.service} />
        <span className="ml-auto">
          <StatusBadge status={order.status} />
        </span>
      </div>

      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="truncate text-sm font-semibold">{order.customerName ?? 'Counter sale'}</span>
        <span className="shrink-0 text-xs text-admin-faint">
          · <ElapsedTime createdAt={order.createdAt} />
        </span>
        <span className="ml-auto shrink-0 font-display text-[19px]">{money(order.total)}</span>
      </div>

      <p className="truncate text-[12.5px] leading-[1.45] text-admin-muted">
        {order.itemsSummary || 'No line items recorded'}
      </p>
    </Link>
  );
}
