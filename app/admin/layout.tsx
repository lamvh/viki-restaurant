import type { Metadata } from 'next';

import { AdminShell } from '@/components/admin/layout/admin-shell';
import { countNewOrders } from '@/lib/db/count-new-orders';
import { getSessionUser } from '@/lib/auth/get-session-user';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Viki Admin' },
  robots: { index: false, follow: false },
};

/**
 * Admin shell (navigation + chrome), rendered only for a signed-in user.
 *
 * `/admin/login` sits inside this segment, so it is wrapped by this layout too.
 * That means an unauthenticated request must still render its children — bare,
 * without the shell — or the login page itself comes out blank and nobody can
 * ever sign in.
 *
 * Access control does not depend on this layout: `middleware.ts` redirects
 * unauthenticated requests for every `/admin/*` route except the login page, and
 * each guarded page additionally calls `requireStaff()`. This layout is
 * presentation.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) return <>{children}</>;

  const newOrderCount = await countNewOrders();

  return (
    <AdminShell user={user} newOrderCount={newOrderCount}>
      {children}
    </AdminShell>
  );
}
