'use server';

import { revalidatePath } from 'next/cache';

import { requireStaff } from '@/lib/auth/require-role';
import type { OrderStatus } from '@/lib/orders/order-status';
import { settleOrderAsCash, startTerminalPayment } from '@/lib/orders/terminal-payment';
import { updateOrderStatus } from '@/lib/orders/update-order-status';

import type { TerminalActionResult } from './terminal-action-result';

/**
 * Middleware guards pages, not server-action invocation — every action
 * re-checks staff itself. An unguarded action here is a remote control for a
 * card terminal sitting on a public counter.
 */
export async function chargeOrderToTerminal(orderId: string): Promise<TerminalActionResult> {
  await requireStaff();

  const result = await startTerminalPayment(orderId);
  revalidatePath('/admin/orders');
  return result;
}

/** Marks an incomplete order paid in cash. Recorded in `payment_events`. */
export async function markOrderPaidCash(orderId: string): Promise<TerminalActionResult> {
  await requireStaff();

  const result = await settleOrderAsCash(orderId);
  revalidatePath('/admin/orders');
  return result;
}

/** Moves an order through the kitchen flow. Transition validated server-side. */
export async function advanceOrderStatus(orderId: string, to: OrderStatus) {
  await requireStaff();

  const result = await updateOrderStatus(orderId, to);
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  return result;
}
