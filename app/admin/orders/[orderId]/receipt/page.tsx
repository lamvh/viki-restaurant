import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AutoPrint } from '@/components/admin/orders/auto-print';
import { FetchCardReceiptButton } from '@/components/admin/orders/fetch-card-receipt-button';
import { OrderReceipt } from '@/components/admin/orders/order-receipt';
import { getOrderForStaff } from '@/lib/orders/get-order-for-staff';

export const metadata: Metadata = { title: 'Receipt', robots: { index: false, follow: false } };

export const dynamic = 'force-dynamic';

/** Printable itemised bill. `?print=1` opens the print dialog on load. */
export default async function OrderReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { orderId } = await params;
  const { print } = await searchParams;

  const order = await getOrderForStaff(orderId);
  if (!order) notFound();

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="no-print flex w-full max-w-[80mm] items-center justify-between">
        <Link href="/admin/orders" className="text-sm text-ink/60 underline">
          ← Orders
        </Link>
        <PrintButton />
      </div>

      {/* The terminal cannot print our bill, so we pull its receipt text here
          and print both together. */}
      {order.hitTxnRef ? (
        <FetchCardReceiptButton orderId={orderId} hasReceipt={Boolean(order.cardReceipt)} />
      ) : null}

      <div className="rounded-[var(--radius-card)] border border-line shadow-sm">
        <OrderReceipt order={order} />
      </div>

      <AutoPrint enabled={print === '1'} />
    </div>
  );
}

/** Server-rendered form so printing works without shipping a click handler. */
function PrintButton() {
  return (
    <a
      href="?print=1"
      className="rounded-[var(--radius-btn)] bg-brand px-4 py-2 text-sm font-semibold text-surface"
    >
      Print
    </a>
  );
}
