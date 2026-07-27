// Password-based admin session, independent of Supabase Auth.
//
// Exists so the admin panel is reachable without provisioning a Supabase user —
// useful in local development, and on a deployment where Supabase Auth is not
// set up yet.
//
// The session cookie is an HMAC-signed token, so it cannot be forged by editing
// a cookie value. Verification uses Web Crypto only, so this module works in
// middleware (edge) and in server components alike.
//
// SECURITY: there is no hardcoded production secret. `admin` / `admin` is a
// development-only default. In production this login is DISABLED unless
// ADMIN_LOGIN_PASSWORD is explicitly set, so a deployment can never ship with
// guessable default credentials.

export const ADMIN_SESSION_COOKIE = 'viki-admin-session';

/** Eight hours — a counter shift, not a permanent grant. */
const MAX_AGE_SECONDS = 8 * 60 * 60;

const DEV_USER = 'admin';
const DEV_SECRET = 'admin';

type TokenPayload = { u: string; exp: number };

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Whether this login is available at all.
 * - Development: always on, defaulting to admin/admin.
 * - Production: only when ADMIN_LOGIN_PASSWORD is set.
 */
export function adminLoginEnabled(): boolean {
  return !isProduction() || Boolean(process.env.ADMIN_LOGIN_PASSWORD);
}

/** True when the dev fallback is in play — surfaced in the UI so it is obvious. */
export function usingDevDefaults(): boolean {
  return !isProduction() && !process.env.ADMIN_LOGIN_PASSWORD;
}

function expectedUser(): string {
  return process.env.ADMIN_LOGIN_USER || DEV_USER;
}

function expectedSecret(): string | null {
  const configured = process.env.ADMIN_LOGIN_PASSWORD;
  if (configured) return configured;
  return isProduction() ? null : DEV_SECRET;
}

/**
 * Signing key. Prefers a dedicated value, falls back to the service-role key
 * (server-only, never bundled). Both absent means a misconfigured deploy, where
 * login is refused rather than signed with a guessable constant.
 */
function signingKey(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function b64urlEncode(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
}

async function sign(data: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return b64urlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

/** Length-safe, non-short-circuiting comparison. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verifies the submitted pair and returns a signed session token, or null. */
export async function createAdminToken(username: string, secret: string): Promise<string | null> {
  if (!adminLoginEnabled()) return null;

  const key = signingKey();
  const expected = expectedSecret();
  if (!key || !expected) return null;

  if (!constantTimeEqual(username, expectedUser())) return null;
  if (!constantTimeEqual(secret, expected)) return null;

  const payload: TokenPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const body = b64urlEncode(JSON.stringify(payload));
  return `${body}.${await sign(body, key)}`;
}

/** Verifies a session cookie. Returns the username, or null if invalid/expired. */
export async function verifyAdminToken(token: string | undefined): Promise<string | null> {
  if (!token || !adminLoginEnabled()) return null;

  const key = signingKey();
  if (!key) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  if (!constantTimeEqual(signature, await sign(body, key))) return null;

  try {
    const payload = JSON.parse(b64urlDecode(body)) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.u;
  } catch {
    return null;
  }
}

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
};
