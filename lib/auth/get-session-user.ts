import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server-client';

import { ADMIN_SESSION_COOKIE, verifyAdminToken } from './admin-session';

export type Role = 'admin' | 'staff';

export type SessionUser = {
  id: string;
  email: string | null;
  role: Role;
};

/**
 * Resolves the current request's authenticated user + role, reading
 * `profiles.role` from the DB (never trusts client-supplied data). Missing
 * profile row (trigger didn't fire, or role outside admin/staff) → null,
 * i.e. fail closed.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Password-based admin session first — it needs no Supabase user, so the panel
  // stays reachable when Auth is not provisioned. Disabled in production unless
  // ADMIN_LOGIN_PASSWORD is set; see lib/auth/admin-session.ts.
  const store = await cookies();
  const username = await verifyAdminToken(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (username) {
    return { id: `admin-session:${username}`, email: username, role: 'admin' };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) return null;

  return { id: user.id, email: user.email ?? null, role: profile.role };
}
