const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How long ago something happened, in the admin's shorthand ("2 min ago").
 *
 * Staff read this to judge whether an order is running late, so the useful
 * resolution is minutes for the first hour and hours after that. Anything
 * clock-precise would be noise on a service screen.
 *
 * A future timestamp reads as "just now" rather than a negative age — a small
 * clock skew between the database and the browser should not render as
 * "-1 min ago".
 */
export function elapsedLabel(createdAt: string | Date, now: Date = new Date()): string {
  const at = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(at.getTime())) return '';

  const ms = now.getTime() - at.getTime();
  if (ms < MINUTE) return 'just now';
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)} min ago`;
  if (ms < DAY) {
    const hours = Math.floor(ms / HOUR);
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(ms / DAY);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
