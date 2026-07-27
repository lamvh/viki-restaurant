import 'server-only';

import { createServiceClient } from '@/lib/supabase/service-client';

export type PaymentEventKind =
  // Card-present (HIT terminal)
  | 'terminal_started'
  | 'terminal_start_failed'
  | 'terminal_completed'
  // Online (REST / Hosted Payment Page)
  | 'session_created'
  | 'session_failed'
  | 'callback_received'
  | 'fprn_received'
  | 'session_queried'
  | 'marked_paid'
  // Shared
  | 'amount_mismatch'
  | 'settled_cash';

/**
 * Appends to the gateway audit trail — the record you want when a payment is
 * disputed or a reconcile misbehaves.
 *
 * Never throws: a failed audit write must not take down a payment flow. It is
 * logged rather than swallowed silently.
 */
export async function recordPaymentEvent(
  orderId: string,
  kind: PaymentEventKind,
  raw: unknown,
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('payment_events').insert({
      order_id: orderId,
      kind,
      raw: (raw ?? {}) as never,
    });
  } catch (cause) {
    console.error(`payment_events insert failed (${kind}, order ${orderId})`, cause);
  }
}
