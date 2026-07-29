import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { OrderCard } from '@/components/admin/orders/order-card';
import { OrderDetailPanel } from '@/components/admin/orders/order-detail-panel';
import {
  ServiceFilterTabs,
  StatusFilterTabs,
  type FilterTab,
} from '@/components/admin/orders/order-filter-tabs';
import { getOrderForStaff } from '@/lib/orders/get-order-for-staff';
import { listOrders } from '@/lib/db/list-orders';
import { STATUS_LABEL } from '@/lib/orders/order-status';

export const metadata: Metadata = { title: 'Orders' };

// Payment state changes from the terminal, so never serve a cached list.
export const dynamic = 'force-dynamic';

/**
 * Kitchen-first ordering: what staff need to act on comes before history.
 *
 * `unpaid` is not in the design's tab set — its mock never produces that state —
 * but the schema does, and an order awaiting payment is real work that has to
 * stay reachable.
 */
const STATUS_FILTERS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: 'active', label: 'Active', match: (s) => ['new', 'preparing', 'ready'].includes(s) },
  { key: 'new', label: STATUS_LABEL.new, match: (s) => s === 'new' },
  { key: 'preparing', label: STATUS_LABEL.preparing, match: (s) => s === 'preparing' },
  { key: 'ready', label: STATUS_LABEL.ready, match: (s) => s === 'ready' },
  { key: 'completed', label: STATUS_LABEL.completed, match: (s) => s === 'completed' },
  { key: 'unpaid', label: 'Awaiting payment', match: (s) => s === 'pending_payment' },
  { key: 'all', label: 'All', match: () => true },
];

/**
 * The design also offers a "Counter" service tab. Counter sales are written as
 * `pickup` — there is no separate service value — so the tab would open a
 * permanently empty view.
 */
const SERVICE_FILTERS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'pickup', label: 'Pickup', match: (s) => s === 'pickup' },
  { key: 'delivery', label: 'Delivery', match: (s) => s === 'delivery' },
];

/** Filters and selection all live in the URL, so any view is shareable. */
function buildHref(params: { status: string; service: string; order?: string }): string {
  const search = new URLSearchParams();
  if (params.status !== 'active') search.set('status', params.status);
  if (params.service !== 'all') search.set('service', params.service);
  if (params.order) search.set('order', params.order);
  const query = search.toString();
  return query ? `/admin/orders?${query}` : '/admin/orders';
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; service?: string; order?: string }>;
}) {
  const { status, service, order: selectedRef } = await searchParams;

  const activeStatus = STATUS_FILTERS.find((f) => f.key === status) ?? STATUS_FILTERS[0];
  const activeService = SERVICE_FILTERS.find((f) => f.key === service) ?? SERVICE_FILTERS[0];

  const all = await listOrders();
  const orders = all.filter((o) => activeStatus.match(o.status) && activeService.match(o.service));

  // Default to the first order in view, so the panel is never empty while there
  // is something to look at.
  const selected = orders.find((o) => o.reference === selectedRef) ?? orders[0] ?? null;
  const detail = selected ? await getOrderForStaff(selected.id) : null;

  const statusTabs: FilterTab[] = STATUS_FILTERS.map((f) => ({
    key: f.key,
    label: f.label,
    count: all.filter((o) => f.match(o.status) && activeService.match(o.service)).length,
    href: buildHref({ status: f.key, service: activeService.key }),
  }));

  const serviceTabs: FilterTab[] = SERVICE_FILTERS.map((f) => ({
    key: f.key,
    label: f.label,
    href: buildHref({ status: activeStatus.key, service: f.key }),
  }));

  return (
    <div className="mx-auto max-w-[1180px]">
      <AdminPageHeader title="Orders" sub="Live queue and history" />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <StatusFilterTabs tabs={statusTabs} activeKey={activeStatus.key} />
        <div className="ml-auto">
          <ServiceFilterTabs tabs={serviceTabs} activeKey={activeService.key} />
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-[16px] border border-dashed border-admin-line-strong bg-admin-card px-6 py-14 text-center text-sm text-admin-faint">
          No orders in this view.
        </p>
      ) : (
        <div className="grid items-start gap-4 min-[1120px]:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-3">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                selected={selected?.id === o.id}
                href={buildHref({
                  status: activeStatus.key,
                  service: activeService.key,
                  order: o.reference,
                })}
              />
            ))}
          </div>

          {/* Below 1120px the panel drops beneath the list rather than sitting
              beside it — a 380px column and a readable order card do not both
              fit on a tablet held in portrait. */}
          <div className="min-[1120px]:sticky min-[1120px]:top-0">
            {detail && selected ? (
              <OrderDetailPanel order={detail} orderId={selected.id} />
            ) : (
              <div className="rounded-[16px] border border-dashed border-admin-line-strong bg-admin-card px-6 py-16 text-center text-sm text-admin-faint">
                Select an order to see details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
