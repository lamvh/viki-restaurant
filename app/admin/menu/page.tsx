import type { Metadata } from 'next';

import { MenuScreen } from '@/components/admin/menu/menu-screen';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { listMenuForAdmin } from '@/lib/db/list-menu-admin';

export const metadata: Metadata = { title: 'Menu' };

// Prices here decide what customers are charged — never serve a cached copy.
export const dynamic = 'force-dynamic';

export default async function AdminMenuPage() {
  const [categories, user] = await Promise.all([listMenuForAdmin(), getSessionUser()]);

  return <MenuScreen categories={categories} canDelete={user?.role === 'admin'} />;
}
