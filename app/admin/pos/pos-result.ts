// Kept out of `actions.ts` because a "use server" module may only export async
// functions — type exports included.

export type PosOrderResult =
  | { ok: true; orderId: string; reference: string; total: number; charged: boolean }
  /** `orderId` is present when the order was created but the charge failed. */
  | { ok: false; error: string; orderId?: string; reference?: string };
