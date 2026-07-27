'use server';

import { redirect } from 'next/navigation';

import { createOrder } from '@/lib/orders/create-order';
import { startPayment } from '@/lib/orders/start-payment';
import { createServiceClient } from '@/lib/supabase/service-client';
import type { CheckoutPayload } from '@/types/cart';

import type { CheckoutResult } from './checkout-result';

function validate(payload: CheckoutPayload): string | null {
  if (!payload.name.trim()) return 'Please enter your name.';
  if (!/^[0-9 +()-]{6,}$/.test(payload.phone.trim())) return 'Enter a valid phone number.';
  if (payload.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email.trim())) {
    return 'Enter a valid email address.';
  }
  if (payload.service === 'delivery' && !payload.address.trim()) {
    return 'Delivery address is required.';
  }
  return null;
}

/**
 * Places an order. Field validation happens here; **pricing does not** — that
 * lives in `createOrder`, which rebuilds every line from the menu.
 */
export async function submitCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  const invalid = validate(payload);
  if (invalid) return { error: invalid };

  const created = await createOrder(payload);
  if (!created.ok) return { error: created.error };

  if (payload.paymentMethod === 'cash') {
    // Throws internally — must stay outside any try/catch that would swallow it.
    redirect(`/order/${created.order.publicToken}`);
  }

  const started = await startPayment(created.order, {
    email: payload.email.trim(),
    phone: payload.phone.trim(),
  });

  // On failure the order stays `pending_payment` — reusable, not garbage. The
  // customer keeps their cart and can try again.
  if (!started.ok) return { error: started.error };

  return { redirectUrl: started.redirectUrl };
}

/**
 * Reopens payment on an existing order after a decline or a gateway failure.
 *
 * A fresh session is required: the previous one is spent, and re-querying it
 * would return the old declined result for ever.
 */
export async function retryPayment(token: string): Promise<CheckoutResult> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, reference, total, public_token, notification_token, payment_status, customer_phone, email',
    )
    .eq('public_token', token)
    .single();

  if (!order) return { error: 'Order not found.' };
  if (order.payment_status === 'paid') return { error: 'This order is already paid.' };

  // Clear the previous failed attempt so reconcile treats the new session as live.
  await supabase.from('orders').update({ payment_status: 'pending' }).eq('id', order.id);

  const started = await startPayment(
    {
      orderId: order.id,
      reference: order.reference,
      publicToken: order.public_token,
      notificationToken: order.notification_token,
      total: Number(order.total),
    },
    { email: order.email ?? '', phone: order.customer_phone ?? '' },
  );

  if (!started.ok) return { error: started.error };
  return { redirectUrl: started.redirectUrl };
}
