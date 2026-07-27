'use server';

// Connection spike for the Windcave HIT terminal. No order, no database — this
// exists to prove credentials, envelope, and device behaviour. Removed once the
// real charge flow lands.

import { requireStaff } from '@/lib/auth/require-role';
import {
  formatHitAmount,
  pollStatus,
  sendButton,
  startPurchase,
} from '@/lib/windcave/hit-client';
import type { HitButtonValue } from '@/lib/windcave/hit-types';

import { parseTestAmount, type SpikeResult } from './spike-config';

function fail(cause: unknown): SpikeResult {
  // Surfaced verbatim on screen — the whole point of a spike is visibility.
  return { ok: false, error: cause instanceof Error ? cause.message : String(cause) };
}

/**
 * Starts a sale for the submitted amount. `TxnRef` must be unique per attempt or
 * the terminal replays the previous result, which reads as a hardware fault.
 */
export async function startTestPurchase(rawAmount: string): Promise<SpikeResult> {
  await requireStaff();

  // Validated server-side. A form value must never reach a card reader unchecked.
  const amount = parseTestAmount(rawAmount);
  if (!amount.ok) return { ok: false, error: amount.error };

  const txnRef = `TEST-${Date.now()}`;

  try {
    const status = await startPurchase({
      amount: formatHitAmount(amount.value),
      currency: process.env.WINDCAVE_CURRENCY ?? 'NZD',
      txnRef,
    });
    return { ok: true, txnRef, status };
  } catch (cause) {
    return fail(cause);
  }
}

export async function pollTestPurchase(txnRef: string): Promise<SpikeResult> {
  await requireStaff();

  try {
    return { ok: true, txnRef, status: await pollStatus(txnRef) };
  } catch (cause) {
    return fail(cause);
  }
}

/**
 * Relays a soft-button press — a separate `UI` transaction, not a field on
 * Status. This is also the only way to cancel: the protocol has no Cancel
 * TxnType, so a sale can be stopped from here only while the terminal is
 * offering a button. Otherwise it must be cancelled on the device itself.
 */
export async function pressTestButton(
  txnRef: string,
  name: 'B1' | 'B2',
  value: HitButtonValue,
): Promise<SpikeResult> {
  await requireStaff();

  try {
    return { ok: true, txnRef, status: await sendButton(txnRef, name, value) };
  } catch (cause) {
    return fail(cause);
  }
}
