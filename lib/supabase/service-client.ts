import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

import { getSupabaseUrl } from './env';

/**
 * Service-role Supabase client — bypasses RLS. Import ONLY from server code
 * (server actions / route handlers) that has already verified the caller's
 * `profiles.role` via lib/auth. The `server-only` import above fails the
 * build if this ever ends up in a client bundle.
 */
export function createServiceClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL are not set.');
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
