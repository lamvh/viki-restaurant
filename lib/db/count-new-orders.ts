import { requireStaff } from '@/lib/auth/require-role';
import { createServiceClient } from '@/lib/supabase/service-client';

/**
 * How many orders are sitting in `new` — the badge on the Orders nav item.
 *
 * Runs on every admin page (it lives in the layout), so it is a `head` count
 * rather than a row read. A failure degrades to 0: a missing badge is a far
 * better outcome than an admin shell that will not render.
 */
export async function countNewOrders(): Promise<number> {
  await requireStaff();

  // Service role: the admin password login is not a Supabase Auth session, so
  // an RLS-bound read returns nothing. Authorisation is enforced above.
  const supabase = createServiceClient();

  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');

  if (error || count === null) return 0;
  return count;
}
