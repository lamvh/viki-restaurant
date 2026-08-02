// Lunch vs dinner service, used by the homepage to switch its "Popular right
// now" picks and to lock grill-only dishes until the charcoal is lit.
//
// Pure functions taking the hour explicitly: the caller decides where "now"
// comes from, which keeps this testable and keeps the server render free of
// clock reads that would not survive hydration.

/** True once the kitchen has switched to dinner service. */
export function isDinnerService(hour: number, dinnerFromHour: number): boolean {
  return hour >= dinnerFromHour;
}

/** 24h hour → the short form used in copy: 17 → "5pm", 11 → "11am". */
export function formatHour(hour: number): string {
  const clock = hour > 12 ? hour - 12 : hour;
  return `${clock}${hour >= 12 ? 'pm' : 'am'}`;
}

/** One restaurant, one clock — not the server's and not the visitor's. */
export const RESTAURANT_TIME_ZONE = 'Pacific/Auckland';

/**
 * Current hour (0–23) at the restaurant.
 *
 * Pinned to the venue's time zone so a UTC server and a visitor in Sydney both
 * agree on whether the grill is on. `h23` rather than `hour12: false`, which
 * some ICU builds render as "24" at midnight.
 */
export function restaurantHour(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: RESTAURANT_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  return Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
}
