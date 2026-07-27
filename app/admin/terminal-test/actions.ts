'use server';

// Connection spike for the Windcave HIT terminal. Fixed amount, no order, no
// database — this exists to prove credentials, envelope, and device
// reachability. Removed once the real charge flow lands.

import { requireStaff } from '@/lib/auth/require-role';
import {
  formatHitAmount,
  pollStatus,
  sendButton,
  startPurchase,
} from '@/lib/windcave/hit-client';
import type { HitButtonValue } from '@/lib/windcave/hit-types';

import { TEST_AMOUNT, type SpikeResult } from './spike-config';

function fail(cause: unknown): SpikeResult {
  // Surfaced verbatim on screen — the whole point of a spike is visibility.
  return { ok: false, error: cause instanceof Error ? cause.message : String(cause) };
}

/**
 * Starts a fixed-amount test sale. `TxnRef` must be unique per attempt or the
 * terminal replays the previous result, which reads as a hardware fault.
 */
export async function startTestPurchase(): Promise<SpikeResult> {
  await requireStaff();

  const txnRef = `TEST-${Date.now()}`;

  try {
    const status = await startPurchase({
      amount: formatHitAmount(TEST_AMOUNT),
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
 * Relays a soft-button press. This is a separate `UI` transaction, not a field
 * on Status — confirmed against PXHIT v2.3. Press, then resume polling.
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
