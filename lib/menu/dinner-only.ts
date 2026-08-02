import type { MenuItem } from '@/types/menu';

/**
 * Whether a dish is only served once the charcoal grill is lit.
 *
 * Read from the description rather than a column: the kitchen already writes
 * "Dinner only." into the copy for these dishes, and both the database and the
 * `data/menu/*` fallback carry it today. A `dinner_only` column is the durable
 * fix — until one exists, deriving it here keeps one rule in one place instead
 * of scattering `desc.includes(...)` through the UI.
 */
const DINNER_ONLY = /\bdinner only\b/i;

export function isDinnerOnly(item: Pick<MenuItem, 'desc'>): boolean {
  return DINNER_ONLY.test(item.desc);
}
