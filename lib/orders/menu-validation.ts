/** Shared validation for menu edits. Pure, so it is unit-testable. */

import type { Tag } from '@/types/menu';

export type PriceResult = { ok: true; value: number } | { ok: false; error: string };

/** The dietary tags a dish may carry, in the order the edit dialog shows them. */
export const MENU_TAGS: Tag[] = ['GF', 'DF', 'VEG', 'R18'];

/**
 * Validates a tag selection coming off the wire.
 *
 * Returns null — rather than silently dropping the bad entry — when anything
 * outside the known set appears. Tags drive customer-facing dietary claims, so
 * quietly accepting a partial write is the wrong failure mode.
 */
export function sanitiseTags(raw: unknown): Tag[] | null {
  if (!Array.isArray(raw)) return null;

  const seen: Tag[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') return null;
    const tag = entry.toUpperCase() as Tag;
    if (!MENU_TAGS.includes(tag)) return null;
    if (!seen.includes(tag)) seen.push(tag);
  }

  // Emitted in a fixed order so an unchanged selection produces an identical row.
  return MENU_TAGS.filter((tag) => seen.includes(tag));
}

/** Upper bound is a typo guard, not a business rule. */
const MAX_PRICE = 1000;

export function parseMenuPrice(raw: unknown): PriceResult {
  const text = String(raw ?? '').trim();

  // `Number('')` is 0, so a blank field would silently make a dish free.
  if (text === '') return { ok: false, error: 'Enter a price.' };

  const value = Number(text);
  if (!Number.isFinite(value)) return { ok: false, error: 'Enter a valid price.' };
  if (value < 0) return { ok: false, error: 'Price cannot be negative.' };
  if (value > MAX_PRICE) return { ok: false, error: `Price cannot exceed ${MAX_PRICE}.` };
  // Sub-cent prices cannot be charged and would desync the payment amount check.
  if (Math.round(value * 100) !== value * 100) {
    return { ok: false, error: 'Price cannot be smaller than one cent.' };
  }

  return { ok: true, value };
}

/**
 * URL/-cart-key-safe slug. The slug is the domain id used in cart lines and
 * order history, so it must stay stable and predictable.
 */
export function toSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40);
}
