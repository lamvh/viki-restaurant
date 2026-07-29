// Kept out of `actions.ts` because a "use server" module may only export async
// functions — type exports included.

export type MenuActionResult = { ok: true } | { ok: false; error: string };
