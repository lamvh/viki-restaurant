// Shared constants + types for the terminal connection spike. Kept out of
// `actions.ts` because a "use server" module may only export async functions.

import type { HitStatus } from '@/lib/windcave/hit-types';

/** Amount the form starts on. */
export const DEFAULT_TEST_AMOUNT = 1;

/** Upper bound for the test screen. Not a business rule — a guard against typos. */
export const MAX_TEST_AMOUNT = 500;

export type SpikeResult =
  | { ok: true; txnRef: string; status: HitStatus }
  | { ok: false; error: string };

export type ParsedAmount = { ok: true; value: number } | { ok: false; error: string };

/**
 * Validates a submitted amount. Runs on the server: even on a throwaway screen,
 * the value that reaches a card terminal is never taken on trust from a form.
 */
export function parseTestAmount(raw: unknown): ParsedAmount {
  const value = Number(String(raw ?? '').trim());

  if (!Number.isFinite(value)) return { ok: false, error: 'Enter a valid amount.' };
  if (value <= 0) return { ok: false, error: 'Amount must be greater than zero.' };
  if (value > MAX_TEST_AMOUNT) {
    return { ok: false, error: `Amount must not exceed ${MAX_TEST_AMOUNT}.` };
  }
  // Sub-cent precision cannot be charged and would desync the mismatch check.
  if (Math.round(value * 100) !== value * 100) {
    return { ok: false, error: 'Amount cannot be smaller than one cent.' };
  }

  return { ok: true, value };
}
