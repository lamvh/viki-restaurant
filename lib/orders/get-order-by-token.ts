import 'server-only';

import { createServiceClient } from '@/lib/supabase/service-client';

export type OrderItemView = {
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  options: string[];
  notes: string | null;
};

export type OrderView = {
  reference: string;
  customerName: string | null;
  customerPhone: string | null;
  service: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  total: number;
  createdAt: string;
  items: OrderItemView[];
};

/**
 * Reads a customer's own order by its opaque token. Deliberately returns no
 * tokens, ids or gateway fields — this feeds a page anyone holding the URL can
 * open.
 */
export async function getOrderByToken(token: string): Promise<OrderView | null> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('orders')
    .select(
      'reference, customer_name, customer_phone, service, status, payment_status, payment_method, subtotal, total, created_at, order_items(item_name, quantity, unit_price, line_total, options, notes)',
    )
    .eq('public_token', token)
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
