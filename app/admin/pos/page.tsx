import type { Metadata } from 'next';

import { PosScreen } from '@/components/admin/pos/pos-screen';
import { getMenu } from '@/lib/db/get-menu';
import { requireStaff } from '@/lib/auth/require-role';

export const metadata: Metadata = { title: 'Counter' };

export const dynamic = 'force-dynamic';

/**
 * Counter till for walk-in customers — the case the card terminal actually
 * serves. Orders placed online are worked from `/admin/orders` instead; both end
 * up as the same kind of order.
 *
 * Rendered full-bleed: the shell gives this route the whole content area and the
 * till manages its own scrolling, because the dish grid and the ticket have to
 * scroll independently.
 */
export default async function AdminPosPage() {
  await requireStaff();

  const menu = await getMenu();

  return <PosScreen categories={menu} />;
}
