'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  ADMIN_COOKIE_OPTIONS,
  ADMIN_SESSION_COOKIE,
  createAdminToken,
} from '@/lib/auth/admin-session';

export type AdminLoginState = { error: string } | null;

/**
 * Password login that does not require a Supabase user. Off in production
 * unless ADMIN_LOGIN_PASSWORD is set — see lib/auth/admin-session.ts.
 */
export async function signInWithPassword(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const username = String(formData.get('username') ?? '');
  const secret = String(formData.get('password') ?? '');

  const token = await createAdminToken(username, secret);
  // One message for every failure mode: wrong user, wrong secret, or login
  // disabled. Distinguishing them tells an attacker which half to keep guessing.
  if (!token) return { error: 'Incorrect username or password.' };

  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, ADMIN_COOKIE_OPTIONS);

  redirect('/admin');
}
