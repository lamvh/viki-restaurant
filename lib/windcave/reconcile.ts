import 'server-only';

import { recordPaymentEvent } from '@/lib/orders/payment-events';
import { createServiceClient } from '@/lib/supabase/service-client';

import { formatAmount, querySession } from './client';
import type { WindcaveSession, WindcaveTransaction } from './types';

export type ReconcileOutcome = 'paid' | 'failed' | 'pending' | 'mismatch' | 'skipped';

function settledTransaction(session: WindcaveSession): WindcaveTransaction | undefined {
  // Prefer an authorised attempt; otherwise the latest, for its decline text.
  const list = session.transactions ?? [];
  return list.find((t) => t.authorised === true) ?? list[list.length - 1];
}

/**
 * The single source of truth for online payment state.
 *
 * **Neither the callback query param nor the FPRN body is evidence.** Both are
 * "something happened, go look" triggers: a customer can hand-edit
 * `?outcome=approved`, and an FPRN POST is unsigned and forgeable. Only this
 * server-side query decides.
 *
 * Safe to call repeatedly and concurrently — the customer's return and the FPRN
 * webhook both land here.
 */
export async function reconcileSession(orderId: string): Promise<ReconcileOutcome> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, total, payment_status, windcave_session_id')
    .eq('id', orderId)
    .single();

  if (!order) return 'skipped';
  if (order.payment_status === 'paid') return 'paid';
  if (!order.windcave_session_id) return 'skipped';

  let session: WindcaveSession;
  try {
    session = await querySession(order.windcave_session_id);
  } catch (cause) {
    console.error('Windcave query-session failed', cause);
    // Unknown, not failed — a network blip must not mark a paid order unpaid.
    return 'pending';
  }

  await recordPaymentEvent(orderId, 'session_queried', session);

  const txn = settledTransaction(session);

  if (txn?.authorised === true) {
    const expected = formatAmount(Number(order.total));
    const actual = txn.amount ?? session.amount;

    // Authorised alone is not enough: a session opened against a wrong amount
    // must never fulfil an order. Flag it for a human instead.
    if (actual !== undefined && actual !== expected) {
      await recordPaymentEvent(orderId, 'amount_mismatch', { expected, actual, session });
      return 'mismatch';
    }

    // Conditional update = idempotency. Two concurrent reconciles, one transition.
    const { data: updated } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_method: 'card',
        status: 'new',
        paid_at: new Date().toISOString(),
        windcave_transaction_id: txn.id ?? null,
      })
      .eq('id', orderId)
      .eq('payment_status', 'pending')
      .select('id');

    if (updated && updated.length > 0) {
      await recordPaymentEvent(orderId, 'marked_paid', { transactionId: txn.id });
    }
    return 'paid';
  }

  // A finished session without authorisation is a decline. The order stays
  // `pending_payment` so the customer can retry against the same order.
  if (session.state === 'complete') {
    await supabase
      .from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', orderId)
      .eq('payment_status', 'pending');
    return 'failed';
  }

  return 'pending';
}
