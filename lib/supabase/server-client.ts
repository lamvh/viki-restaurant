import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/types/supabase';

import { getSupabaseAnonKey, getSupabaseUrl } from './env';

/**
 * Server-side Supabase client bound to the request's cookies — for server
 * components, server actions, and route handlers reading the caller's session.
 * Anon key + RLS govern what it can read/write.
 */
export async function createClient() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error('Supabase env vars are not set — see .env.example.');
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — middleware refreshes the
          // session instead, so a failed write here is safe to ignore.
        }
      },
    },
  });
}
