import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/supabase';

import { getSupabaseAnonKey, getSupabaseUrl } from './env';

/** Browser-side Supabase client for client components (auth forms, etc). */
export function createClient() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error('Supabase env vars are not set — see .env.example.');
  }

  return createBrowserClient<Database>(url, anonKey);
}
