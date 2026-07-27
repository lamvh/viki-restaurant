import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  adminLoginEnabled,
  createAdminToken,
  usingDevDefaults,
  verifyAdminToken,
} from './admin-session';

beforeEach(() => {
  vi.stubEnv('ADMIN_SESSION_SECRET', 'test-signing-key');
  vi.stubEnv('ADMIN_LOGIN_USER', '');
  vi.stubEnv('ADMIN_LOGIN_PASSWORD', '');
  vi.stubEnv('NODE_ENV', 'development');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('development defaults', () => {
  it('accepts admin/admin', async () => {
    expect(await createAdminToken('admin', 'admin')).toBeTruthy();
  });

  it('reports that dev defaults are in use', () => {
    expect(adminLoginEnabled()).toBe(true);
    expect(usingDevDefaults()).toBe(true);
  });

  it('rejects a wrong password', async () => {
    expect(await createAdminToken('admin', 'wrong')).toBeNull();
  });

  it('rejects a wrong username', async () => {
    expect(await createAdminToken('root', 'admin')).toBeNull();
  });
});

describe('production safety', () => {
  it('disables the login entirely when no password is configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    // The whole point: a production deploy must never accept admin/admin.
    expect(adminLoginEnabled()).toBe(false);
    expect(usingDevDefaults()).toBe(false);
    expect(await createAdminToken('admin', 'admin')).toBeNull();
  });

  it('accepts only the configured password once one is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_LOGIN_PASSWORD', 'a-real-long-password');

    expect(await createAdminToken('admin', 'admin')).toBeNull();
    expect(await createAdminToken('admin', 'a-real-long-password')).toBeTruthy();
  });

  it('honours a custom username', async () => {
    vi.stubEnv('ADMIN_LOGIN_USER', 'viki-ops');
    vi.stubEnv('ADMIN_LOGIN_PASSWORD', 'pw');

    expect(await createAdminToken('admin', 'pw')).toBeNull();
    expect(await createAdminToken('viki-ops', 'pw')).toBeTruthy();
  });

  it('refuses to issue a token with no signing key available', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    // Better to fail closed than to sign with a guessable constant.
    expect(await createAdminToken('admin', 'admin')).toBeNull();
  });
});

describe('token verification', () => {
  it('round-trips a freshly issued token', async () => {
    const token = await createAdminToken('admin', 'admin');

    expect(await verifyAdminToken(token!)).toBe('admin');
  });

  it('rejects a tampered payload', async () => {
    const token = await createAdminToken('admin', 'admin');
    const [, signature] = token!.split('.');
    const forgedBody = btoa(JSON.stringify({ u: 'attacker', exp: 9_999_999_999 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(await verifyAdminToken(`${forgedBody}.${signature}`)).toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const token = await createAdminToken('admin', 'admin');
    const [body] = token!.split('.');

    expect(await verifyAdminToken(`${body}.not-a-real-signature`)).toBeNull();
  });

  it('rejects a token signed with a different key', async () => {
    const token = await createAdminToken('admin', 'admin');
    vi.stubEnv('ADMIN_SESSION_SECRET', 'a-different-key');

    expect(await verifyAdminToken(token!)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const body = btoa(JSON.stringify({ u: 'admin', exp: 1 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    // Signed correctly, but stale — expiry is enforced independently of the HMAC.
    const token = await createAdminToken('admin', 'admin');
    const signature = token!.split('.')[1];

    expect(await verifyAdminToken(`${body}.${signature}`)).toBeNull();
  });

  it('rejects garbage and empty input', async () => {
    expect(await verifyAdminToken(undefined)).toBeNull();
    expect(await verifyAdminToken('')).toBeNull();
    expect(await verifyAdminToken('nonsense')).toBeNull();
    expect(await verifyAdminToken('a.b.c')).toBeNull();
  });
});
