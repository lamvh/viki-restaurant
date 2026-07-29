/** Kitchen workflow states, in the order staff move through them. */
export const KITCHEN_FLOW = ['new', 'preparing', 'ready', 'completed'] as const;

export type OrderStatus =
  | 'pending_payment'
  | 'new'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  new: 'New',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/**
 * The next step in the kitchen flow, or null at the end.
 *
 * `pending_payment` deliberately has no next step: an order nobody has paid for
 * is not kitchen work, and letting it advance would put unpaid food on the pass.
 */
export function nextStatus(status: string): OrderStatus | null {
  const index = KITCHEN_FLOW.indexOf(status as (typeof KITCHEN_FLOW)[number]);
  if (index === -1 || index === KITCHEN_FLOW.length - 1) return null;
  return KITCHEN_FLOW[index + 1];
}

/** Cancelling is available until the order is finished or already cancelled. */
export function canCancel(status: string): boolean {
  return status !== 'completed' && status !== 'cancelled';
}

/** Guards the server action against an arbitrary string from the client. */
export function isValidTransition(from: string, to: string): boolean {
  if (to === 'cancelled') return canCancel(from);
  return nextStatus(from) === to;
}
