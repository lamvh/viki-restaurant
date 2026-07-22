import type { Metadata } from 'next';

import { AdminSidebar } from '@/components/admin/layout/admin-sidebar';
import { AdminTopbar } from '@/components/admin/layout/admin-topbar';
import { getSessionUser } from '@/lib/auth/get-session-user';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Viki Admin' },
  robots: { index: false, follow: false },
};

/**
 * Guarded admin shell (sidebar + top bar). Server-side session re-check is
 * defence in depth beyond the middleware guard. `/admin/login` lives in a
 * sibling segment and is intentionally NOT wrapped by this layout, so an
 * unauthenticated user is redirected to login by middleware rather than looping.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  // Middleware already redirects unauthenticated requests; render nothing if a
  // session slips through without a valid profile (fail closed).
  if (!user) return null;

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
