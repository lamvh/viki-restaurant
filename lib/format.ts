// Formatting helpers.

/** Money format: "$" + 2 decimals (design spec §5). */
export function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
