import 'server-only';

import { createServiceClient } from '@/lib/supabase/service-client';
import { createSession, formatAmount, hppUrl } from '@/lib/windcave/client';
import { windcaveEnv } from '@/lib/windcave/env';

import type { CreatedOrder } from './create-order';
import { recordPaymentEvent } from './payment-events';

export type StartPaymentResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

/**
 * Opens a Windcave session for an already-persisted order and returns the hosted
 * payment page URL.
 *
 * The charged amount comes from the order, never the request — the same rule as
 * the terminal channel.
 */
export async function startPayment(
  order: CreatedOrder,
  customer: { email: string; phone: string },
): Promise<StartPaymentResult> {
  const env = windcaveEnv();

  // Absolute, config-derived URLs. A Host header is attacker-controlled, so
  // deriving these from the request would let someone divert payment callbacks.
  const base = env.notificationBaseUrl;
  const returnUrl = `${base}/order/return/${order.publicToken}`;

  try {
    const session = await createSession({
      amount: formatAmount(order.total),
      currency: env.currency,
      merchantReference: order.reference,
      callbackUrls: {
        approved: `${returnUrl}?outcome=approved`,
        declined: `${returnUrl}?outcome=declined`,
        cancelled: `${returnUrl}?outcome=cancelled`,
      },
      notificationUrl: `${base}/api/windcave/fprn?t=${order.notificationToken}`,
      customer: {
        email: customer.email || undefined,
        phoneNumber: customer.phone || undefined,
      },
    });

    const url = hppUrl(session);

    const supabase = createServiceClient();
    await supabase
      .from('orders')
      .update({
        windcave_session_id: session.id,
        // Stored intact — Windcave recommends passing links through unmodified,
        // and it keeps a future Drop-In swap frontend-only.
        windcave_links: (session.links ?? null) as never,
      })
      .eq('id', order.orderId);

    await recordPaymentEvent(order.orderId, 'session_created', session);

    return { ok: true, redirectUrl: url };
  } catch (cause) {
    await recordPaymentEvent(order.orderId, 'session_failed', {
      message: cause instanceof Error ? cause.message : String(cause),
    });
    console.error('Windcave session creation failed', cause);
    // The order stays `pending_payment` — reusable, not garbage.
    return { ok: false, error: 'We could not reach the payment provider. Please try again.' };
  }
}
