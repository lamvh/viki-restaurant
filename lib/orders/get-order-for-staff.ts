import 'server-only';

import { requireStaff } from '@/lib/auth/require-role';
import { createServiceClient } from '@/lib/supabase/service-client';

import type { OrderView } from './get-order-by-token';

/** Staff view adds the terminal's own receipt text, which customers never see. */
export type StaffOrderView = OrderView & {
  cardReceipt: string | null;
  hitTxnRef: string | null;
};

/**
 * Staff-guarded read by order id — the receipt view.
 *
 * Separate from `getOrderByToken` because that one is addressed by an opaque
 * token anyone holding the URL can open, so it must never accept an id.
 */
export async function getOrderForStaff(orderId: string): Promise<StaffOrderView | null> {
  await requireStaff();

  const supabase = createServiceClient();

  const { data } = await supabase
    .from('orders')
    .select(
      'reference, customer_name, customer_phone, service, status, payment_status, payment_method, subtotal, total, created_at, card_receipt, hit_txn_ref, order_items(item_name, quantity, unit_price, line_total, options, notes)',
    )
    .eq('id', orderId)
    .single();

  if (!data) return null;

  return {
    reference: data.reference,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    service: data.service,
    status: data.status,
    paymentStatus: data.payment_status,
    paymentMethod: data.payment_method,
    subtotal: Number(data.subtotal),
    total: Number(data.total),
    createdAt: data.created_at,
    cardReceipt: data.card_receipt,
    hitTxnRef: data.hit_txn_ref,
    items: (data.order_items ?? []).map((row) => ({
      itemName: row.item_name,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      lineTotal: Number(row.line_total),
      options: Array.isArray(row.options) ? (row.options as string[]) : [],
      notes: row.notes,
    })),
  };
}
