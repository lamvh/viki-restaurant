import 'server-only';

import { totals } from '@/lib/pricing';
import { createServiceClient } from '@/lib/supabase/service-client';
import type { CheckoutPayload } from '@/types/cart';

import { opaqueToken, orderReference } from './reference';
import { rebuildCart } from './rebuild-cart';

export type CreatedOrder = {
  orderId: string;
  reference: string;
  publicToken: string;
  notificationToken: string;
  total: number;
};

export type CreateOrderResult =
  | { ok: true; order: CreatedOrder }
  | { ok: false; error: string };

/**
 * Persists an order with a **server-computed** total.
 *
 * The client's displayed total never reaches the database: lines are rebuilt
 * from the menu and re-totalled through `lib/pricing`, the same module the UI
 * uses, so what is shown and what is charged cannot drift.
 */
export async function createOrder(payload: CheckoutPayload): Promise<CreateOrderResult> {
  const rebuilt = rebuildCart(payload.lines);
  if (!rebuilt.ok) return { ok: false, error: rebuilt.error };

  const t = totals(rebuilt.lines, payload.service);
  // Enforced here as well as in the UI — the UI guard is a courtesy, this one counts.
  if (t.belowDeliveryMin) {
    return { ok: false, error: 'Your order is below the delivery minimum.' };
  }

  const isCash = payload.paymentMethod === 'cash';
  const reference = orderReference();
  const publicToken = opaqueToken();
  const notificationToken = opaqueToken();

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .insert({
      service: payload.service,
      customer_name: payload.name.trim(),
      customer_phone: payload.phone.trim() || null,
      email: payload.email.trim() || null,
      address: payload.service === 'delivery' ? payload.address.trim() : null,
      subtotal: t.subtotal,
      total: t.total,
      reference,
      public_token: publicToken,
      notification_token: notificationToken,
      payment_method: payload.paymentMethod,
      // Pay-on-collection is owed, not pending: it blocks nothing in the kitchen.
      payment_status: isCash ? 'unpaid' : 'pending',
      status: isCash ? 'new' : 'pending_payment',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Order insert failed', error);
    return { ok: false, error: 'Could not create your order. Please try again.' };
  }

  const items = rebuilt.lines.map((line) => ({
    order_id: data.id,
    item_name: line.name,
    unit_price: line.unit,
    quantity: line.qty,
    options: line.labels,
    // Captured in the item modal and at the till. Without this the kitchen never
    // sees "no coriander".
    notes: line.notes || null,
    line_total: line.unit * line.qty,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(items);

  if (itemsError) {
    // Supabase's REST client has no multi-table transaction, so compensate:
    // never leave a chargeable order standing with no lines behind it.
    await supabase.from('orders').delete().eq('id', data.id);
    console.error('Order items insert failed; order rolled back', itemsError);
    return { ok: false, error: 'Could not create your order. Please try again.' };
  }

  return {
    ok: true,
    order: { orderId: data.id, reference, publicToken, notificationToken, total: t.total },
  };
}
