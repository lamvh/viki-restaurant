import 'server-only';

import { createServiceClient } from '@/lib/supabase/service-client';

import { isValidTransition, type OrderStatus } from './order-status';

export type StatusUpdateResult = { ok: true } | { ok: false; error: string };

/**
 * Advances an order through the kitchen flow.
 *
 * The transition is validated server-side against the order's *current* status,
 * so a stale tab cannot skip steps, and the conditional update means two staff
 * pressing at once produce one move rather than two.
 */
export async function updateOrderStatus(
  orderId: string,
  to: OrderStatus,
): Promise<StatusUpdateResult> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .single();

  if (!order) return { ok: false, error: 'Order not found.' };

  if (!isValidTransition(order.status, to)) {
    return { ok: false, error: `Cannot move a ${order.status} order to ${to}.` };
  }

  const { data: moved } = await supabase
    .from('orders')
    .update({ status: to })
    .eq('id', orderId)
    // Someone else may have moved it since this page rendered.
    .eq('status', order.status)
    .select('id');

  if (!moved || moved.length === 0) {
    return { ok: false, error: 'Someone else just changed this order. Refresh and try again.' };
  }

  return { ok: true };
}
