'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ADMIN_SESSION_COOKIE } from '@/lib/auth/admin-session';
import { createClient } from '@/lib/supabase/server-client';

export async function signOut() {
  // Clear both session kinds — a user may hold either, and leaving one behind
  // would leave them still signed in after clicking sign out.
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect('/admin/login');
}
