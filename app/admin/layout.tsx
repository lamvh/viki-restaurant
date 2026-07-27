import type { Metadata } from 'next';

import { AdminSidebar } from '@/components/admin/layout/admin-sidebar';
import { AdminTopbar } from '@/components/admin/layout/admin-topbar';
import { getSessionUser } from '@/lib/auth/get-session-user';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Viki Admin' },
  robots: { index: false, follow: false },
};

/**
 * Admin shell (sidebar + top bar), rendered only for a signed-in user.
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

  return (
    <div className="flex min-h-screen bg-surface-alt text-ink">
      <AdminSidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar user={user} />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
