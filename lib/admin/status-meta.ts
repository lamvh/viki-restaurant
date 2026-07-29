import type { OrderStatus } from '@/lib/orders/order-status';

/**
 * Pill colours for a status or service badge.
 *
 * These are raw hex rather than token classes because the set is data, not
 * layout: a badge picks its palette from a value at runtime, so the colours have
 * to be addressable as values. They are applied through inline `style`, which is
 * also what keeps Tailwind from having to enumerate every combination.
 */
export type BadgePalette = {
  label: string;
  /** Pill background. */
  bg: string;
  /** Pill text. */
  fg: string;
  /** Leading dot, where the badge shows one. */
  dot: string;
};

/**
 * Kitchen-status palettes, from the admin design.
 *
 * The design's mock only ever produces new/preparing/ready/completed. The real
 * schema has two more states, so both get a mapping here rather than a runtime
 * fallback: `cancelled` reads as a finished-and-inert order (the completed
 * palette), and `pending_payment` reads as in-progress-and-blocking (the
 * preparing palette, which is the design's amber "needs attention" pair).
 */
export const STATUS_META: Record<OrderStatus, BadgePalette> = {
  pending_payment: { label: 'Awaiting payment', bg: '#F5EAD3', fg: '#8A6314', dot: '#B8862F' },
  new: { label: 'New', bg: '#F7E3DF', fg: '#B23A2C', dot: '#B23A2C' },
  preparing: { label: 'Preparing', bg: '#F5EAD3', fg: '#8A6314', dot: '#B8862F' },
  ready: { label: 'Ready', bg: '#DFF0E6', fg: '#256045', dot: '#2F6B4F' },
  completed: { label: 'Completed', bg: '#ECE6DC', fg: '#6E6355', dot: '#9a8f7d' },
  cancelled: { label: 'Cancelled', bg: '#ECE6DC', fg: '#6E6355', dot: '#9a8f7d' },
};

/**
 * Service palettes. Anything that is not a known service falls back to the
 * neutral pair — `service` is a free-text column, so an unexpected value is
 * possible and must not blank the badge out.
 */
const SERVICE_PALETTES: Record<string, BadgePalette> = {
  pickup: { label: 'Pickup', bg: '#DFF0E6', fg: '#256045', dot: '#2F6B4F' },
  delivery: { label: 'Delivery', bg: '#F5EAD3', fg: '#8A6314', dot: '#B8862F' },
};

const NEUTRAL: BadgePalette = { label: 'Order', bg: '#ECE6DC', fg: '#6E6355', dot: '#9a8f7d' };

export function serviceMeta(service: string): BadgePalette {
  return SERVICE_PALETTES[service] ?? { ...NEUTRAL, label: service };
}

/** Tinted block behind the service details in the order-detail panel. */
export function serviceBlockBg(service: string): string {
  return service === 'delivery' ? '#F9F0DC' : '#E9F3EC';
}

export function statusMeta(status: string): BadgePalette {
  return STATUS_META[status as OrderStatus] ?? NEUTRAL;
}
