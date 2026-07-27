import { requireStaff } from '@/lib/auth/require-role';
import { createServiceClient } from '@/lib/supabase/service-client';

export type StaffOrder = {
  id: string;
  reference: string;
  service: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string | null;
  customerPhone: string | null;
  hitTxnRef: string | null;
  createdAt: string;
};

/** Staff-guarded recent-orders read for the admin order screen. */
export async function listOrders(limit = 50): Promise<StaffOrder[]> {
  await requireStaff();

  // Reads go through the service-role client, not the RLS-bound one.
  //
  // Authorisation is enforced above by `requireStaff()`. The RLS policy on
  // `orders` requires `auth.role() = 'authenticated'`, which only holds for a
  // Supabase Auth session — the admin password login (lib/auth/admin-session.ts)
  // is not one, so an RLS-bound read silently returns zero rows for a perfectly
  // valid staff user.
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, reference, service, total, status, payment_status, payment_method, customer_name, customer_phone, hit_txn_ref, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((o) => ({
    id: o.id,
    reference: o.reference,
    service: o.service,
    total: Number(o.total),
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    hitTxnRef: o.hit_txn_ref,
    createdAt: o.created_at,
  }));
}
