// Kept out of `actions.ts` because a "use server" module may only export async
// functions — type exports included.

/** `redirectUrl` is used by the online card channel; unused while it is on hold. */
export type CheckoutResult = { error: string } | { redirectUrl: string };
