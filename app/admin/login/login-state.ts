// Kept out of `actions.ts` because a "use server" module may only export async
// functions — the same constraint that broke the terminal-test spike build.

export type AdminLoginState = { error: string } | null;
