'use server';

import { revalidatePath } from 'next/cache';

import { requireStaff } from '@/lib/auth/require-role';
import { createServiceClient } from '@/lib/supabase/service-client';
import { getReceipt } from '@/lib/windcave/hit-client';

/**
 * Pulls the EFTPOS receipt text the terminal generated for a sale.
 *
 * HIT has no way to print our itemised bill on the device — the protocol's model
 * is that the terminal produces receipt content and the POS prints it. This is
 * that fetch, used when a sale predates receipt capture or a customer wants a
 * duplicate.
 */
export async function fetchCardReceipt(
  orderId: string,
  duplicate = false,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireStaff();

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, hit_txn_ref')
    .eq('id', orderId)
    .single();

  // The ref comes from the order, never from the caller — otherwise staff could
  // pull receipts for arbitrary transactions.
  if (!order?.hit_txn_ref) {
    return { ok: false, error: 'This order has no terminal transaction.' };
  }

  try {
    const status = await getReceipt(order.hit_txn_ref, duplicate);
    if (!status.receipt) {
      return { ok: false, error: 'The terminal returned no receipt for this transaction.' };
    }

    await supabase
      .from('orders')
      .update({ card_receipt: status.receipt })
      .eq('id', orderId);

    revalidatePath(`/admin/orders/${orderId}/receipt`);
    return { ok: true };
  } catch (cause) {
    console.error('Receipt fetch failed', cause);
    return { ok: false, error: 'Could not reach the terminal.' };
  }
}
