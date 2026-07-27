import type { Metadata } from 'next';

import { PosScreen } from '@/components/admin/pos/pos-screen';
import { MENU } from '@/data/menu';
import { requireStaff } from '@/lib/auth/require-role';

export const metadata: Metadata = { title: 'Till' };

export const dynamic = 'force-dynamic';

/**
 * Counter till for walk-in customers — the case the card terminal actually
 * serves. Orders placed online are worked from `/admin/orders` instead; both
 * end up as the same kind of order.
 */
export default async function AdminPosPage() {
  await requireStaff();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl">Till</h1>
        <p className="mt-1 text-sm text-ink/50">
          Ring up a counter sale, then take payment on the card terminal or in cash.
        </p>
      </div>

      <PosScreen categories={MENU} />
    </div>
  );
}
