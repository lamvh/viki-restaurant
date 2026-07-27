// Shared constants + types for the terminal connection spike. Kept out of
// `actions.ts` because a "use server" module may only export async functions.

import type { HitStatus } from '@/lib/windcave/hit-types';

/** The spike always charges this much. Deliberately not configurable. */
export const TEST_AMOUNT = 1;

export type SpikeResult =
  | { ok: true; txnRef: string; status: HitStatus }
  | { ok: false; error: string };
