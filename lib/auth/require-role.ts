import { redirect } from 'next/navigation';

import { getSessionUser, type SessionUser } from './get-session-user';

export type { Role } from './get-session-user';

/** Redirects to /admin/login if not authenticated as staff or admin. */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');
  return user;
}

/** Same as requireAuth — staff and admin have equal read access. */
export async function requireStaff(): Promise<SessionUser> {
  return requireAuth();
}

/** Throws if the caller isn't an admin. Use in mutating actions/routes. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Forbidden: admin role required.');
  }
  return user;
}
