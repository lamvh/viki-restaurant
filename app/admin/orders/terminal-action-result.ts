// Kept out of `actions.ts` because a "use server" module may only export async
// functions — type exports included.

export type TerminalActionResult =
  | { ok: true; txnRef: string }
  | { ok: false; error: string };
