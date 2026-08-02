// Formatting helpers.

/** Money format: "$" + 2 decimals (design spec §5). */
export function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Money for running prose — "$4" rather than "$4.00", but "$4.50" when the
 * cents matter. Never use this on a line item or a total, where the trailing
 * zeroes are what make a column of figures readable.
 */
export function moneyLabel(amount: number): string {
  return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}
