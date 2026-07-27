import 'server-only';

import { createServiceClient } from '@/lib/supabase/service-client';
import {
  centsMatch,
  formatHitAmount,
  pollStatus,
  sendButton,
  startPurchase,
} from '@/lib/windcave/hit-client';
import type { HitButtonValue, HitStatus } from '@/lib/windcave/hit-types';

import { recordPaymentEvent } from './payment-events';

export type TerminalActionResult =
  | { ok: true; txnRef: string }
  | { ok: false; error: string };

/**
 * States an order can be charged or settled from. `unpaid` and `failed` both
 * mean *not complete* — neither is terminal, and both are resolvable.
 */
export const CHARGEABLE = ['unpaid', 'failed'];

/**
 * Allocates a fresh `TxnRef`, persists it, then starts the sale on the terminal.
 *
 * **The ref is written BEFORE the request goes out.** If this process dies
 * mid-call the card may still have been charged, and a Status request carrying
 * that same ref is the only way to find out — so it has to survive the crash
 * that loses everything else. This is the card-present equivalent of FPRN.
 */
export async function startTerminalPayment(orderId: string): Promise<TerminalActionResult> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, reference, total, payment_status, hit_attempt')
    .eq('id', orderId)
    .single();

  if (!order) return { ok: false, error: 'Order not found.' };
  if (order.payment_status === 'paid') return { ok: false, error: 'This order is already paid.' };
  if (!CHARGEABLE.includes(order.payment_status)) {
    return { ok: false, error: 'A payment is already in progress on this order.' };
  }

  // A new ref per attempt. Reusing one replays the previous declined result for ever.
  const attempt = (order.hit_attempt ?? 0) + 1;
  const txnRef = `${order.reference}-${attempt}`;

  // Conditional update = the concurrency guard. One physical terminal, so the
  // loser of a race must be told, not shown a second prompt.
  const { data: claimed } = await supabase
    .from('orders')
    .update({ hit_txn_ref: txnRef, hit_attempt: attempt, payment_status: 'pending' })
    .eq('id', orderId)
    .in('payment_status', CHARGEABLE)
    .select('id');

  if (!claimed || claimed.length === 0) {
    return { ok: false, error: 'The terminal is busy with another payment.' };
  }

  await recordPaymentEvent(orderId, 'terminal_started', { txnRef, attempt });

  try {
    await startPurchase({
      // Amount from the persisted order — never from the request.
      amount: formatHitAmount(Number(order.total)),
      currency: process.env.WINDCAVE_CURRENCY ?? 'NZD',
      txnRef,
      merchantReference: order.reference,
    });
  } catch (cause) {
    await recordPaymentEvent(orderId, 'terminal_start_failed', {
      txnRef,
      message: cause instanceof Error ? cause.message : String(cause),
    });
    // Release the claim so staff can retry. The ref stays for forensics.
    await supabase.from('orders').update({ payment_status: 'failed' }).eq('id', orderId);
    return { ok: false, error: 'Could not reach the terminal. Check it is on and connected.' };
  }

  return { ok: true, txnRef };
}

/**
 * Settles an incomplete order in cash — the other way out of `unpaid`/`failed`,
 * alongside retrying the terminal. Conditional so it cannot overwrite a payment
 * that completed on the reader a moment earlier.
 */
export async function settleOrderAsCash(orderId: string): Promise<TerminalActionResult> {
  const supabase = createServiceClient();

  const { data: settled } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      payment_method: 'cash',
      status: 'new',
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .in('payment_status', CHARGEABLE)
    .select('id');

  if (!settled || settled.length === 0) {
    return { ok: false, error: 'This order is not awaiting payment.' };
  }

  await recordPaymentEvent(orderId, 'settled_cash', {});
  return { ok: true, txnRef: '' };
}

export type Settled = 'paid' | 'failed' | 'mismatch';
export type PollOutcome = HitStatus & { settled?: Settled };

/**
 * One poll tick against an in-flight sale, finalising the order the moment the
 * terminal reports `Complete`.
 */
export async function pollTerminalPayment(
  orderId: string,
  txnRef: string,
): Promise<PollOutcome> {
  const status = await pollStatus(txnRef);
  if (!status.complete) return status;

  return { ...status, settled: await finaliseTerminalPayment(orderId, txnRef, status) };
}

/** Relays a soft-button press, then reports the resulting state. */
export async function pressTerminalButton(
  orderId: string,
  txnRef: string,
  name: 'B1' | 'B2',
  value: HitButtonValue,
): Promise<PollOutcome> {
  const status = await sendButton(txnRef, name, value);
  if (!status.complete) return status;

  return { ...status, settled: await finaliseTerminalPayment(orderId, txnRef, status) };
}

/**
 * Idempotent. Safe to call from a second tab, or from a recovery re-poll that
 * lands on a sale which already finished.
 */
export async function finaliseTerminalPayment(
  orderId: string,
  txnRef: string,
  status: HitStatus,
): Promise<Settled> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, total, payment_status')
    .eq('id', orderId)
    .single();

  if (!order) return 'failed';
  if (order.payment_status === 'paid') return 'paid';

  await recordPaymentEvent(orderId, 'terminal_completed', { txnRef, status });

  if (status.result?.authorised === true) {
    const actual = status.result.amountCents;

    // Authorised is not enough. Tipping is off and there is no split bill, so a
    // differing amount means something changed server-side — never fulfil on a
    // figure we did not compute.
    if (actual !== undefined && !centsMatch(Number(order.total), actual)) {
      await recordPaymentEvent(orderId, 'amount_mismatch', {
        expected: formatHitAmount(Number(order.total)),
        actualCents: actual,
        txnRef,
      });
      return 'mismatch';
    }

    // Conditional update = idempotency. Two concurrent finalises, one transition.
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_method: 'terminal',
        status: 'new',
        paid_at: new Date().toISOString(),
        windcave_transaction_id: status.result.transactionId ?? null,
        // The terminal prints its own copy; keeping the text lets the itemised
        // bill carry the card receipt on the same piece of paper.
        card_receipt: status.receipt ?? null,
      })
      .eq('id', orderId)
      .eq('payment_status', 'pending');

    return 'paid';
  }

  // Declined. The order stays chargeable so staff can retry or settle in cash.
  await supabase
    .from('orders')
    .update({ payment_status: 'failed' })
    .eq('id', orderId)
    .eq('payment_status', 'pending');

  return 'failed';
}
