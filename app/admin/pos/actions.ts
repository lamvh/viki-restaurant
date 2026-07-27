'use server';

import { revalidatePath } from 'next/cache';

import { requireStaff } from '@/lib/auth/require-role';
import { createOrder } from '@/lib/orders/create-order';
import { settleOrderAsCash, startTerminalPayment } from '@/lib/orders/terminal-payment';
import type { CheckoutLineInput } from '@/types/cart';

import type { PosOrderResult } from './pos-result';

/**
 * Rings up a counter sale.
 *
 * The order is created first, then charged — the same order it always was, so
 * pricing, the audit trail and the recovery path are shared with online orders
 * rather than forked. Prices come from the menu via `createOrder`; the till
 * cannot name its own total any more than a browser can.
 */
export async function createCounterOrder(
  lines: CheckoutLineInput[],
  mode: 'terminal' | 'cash',
  customerName: string,
  customerPhone: string,
): Promise<PosOrderResult> {
  await requireStaff();

  const created = await createOrder({
    service: 'pickup',
    lines,
    // Walk-in: no contact details are required to take money at a counter.
    name: customerName.trim() || 'Counter sale',
    phone: customerPhone.trim(),
    email: '',
    address: '',
    paymentMethod: 'cash',
  });

  if (!created.ok) return { ok: false, error: created.error };

  const { orderId, reference, total } = created.order;

  if (mode === 'cash') {
    const settled = await settleOrderAsCash(orderId);
    revalidatePath('/admin/orders');
    return settled.ok
      ? { ok: true, orderId, reference, total, charged: false }
      : { ok: false, error: settled.error };
  }

  const started = await startTerminalPayment(orderId);
  revalidatePath('/admin/orders');

  // A terminal that cannot be reached leaves a real, unpaid order behind rather
  // than discarding the sale — staff can retry it or settle it in cash.
  if (!started.ok) return { ok: false, error: started.error, orderId, reference };

  return { ok: true, orderId, reference, total, charged: true };
}
