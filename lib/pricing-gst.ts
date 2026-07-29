/** NZ GST rate. Menu prices are GST-inclusive, as required for consumer pricing. */
export const GST_RATE = 0.15;

/**
 * The GST already contained in a tax-inclusive amount.
 *
 * Display only. Prices in this system are inclusive, so this reveals the tax
 * component of a total rather than adding anything to it — the figure a customer
 * is charged is unchanged, which is why this lives apart from `lib/pricing.ts`.
 *
 * At 15%, the inclusive component is `total × 15/115`, i.e. `total × 3/23`.
 */
export function gstIncludedIn(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.round(((total * GST_RATE) / (1 + GST_RATE)) * 100) / 100;
}
