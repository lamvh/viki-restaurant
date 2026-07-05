// Canonical site origin. Set NEXT_PUBLIC_SITE_URL in production so metadata,
// sitemap, robots, and JSON-LD emit absolute URLs on the real domain.

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

export const SITE_NAME = 'Viki';
export const SITE_LOCALE = 'en_NZ';
