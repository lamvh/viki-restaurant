import type { Metadata } from 'next';

import { TerminalTestPanel } from '@/components/admin/terminal/terminal-test-panel';
import { requireStaff } from '@/lib/auth/require-role';
import { money } from '@/lib/format';

import { TEST_AMOUNT } from './spike-config';

export const metadata: Metadata = { title: 'Terminal test' };

export const dynamic = 'force-dynamic';

/**
 * TEMPORARY — Windcave HIT connection spike.
 *
 * Charges a fixed amount to the card terminal with no order and no database
 * involvement, to prove credentials, XML envelope, and device reachability
 * before the real charge flow is built on them.
 *
 * This route is deleted once `/admin/orders` can charge a real order. A
 * permanently-mounted "charge an arbitrary amount" screen is not something to
 * leave in an admin panel.
 */
export default async function TerminalTestPage() {
  await requireStaff();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl">Terminal test</h1>
        <p className="mt-1 text-sm text-ink/50">
          Connection check for the Windcave card reader. Charges {money(TEST_AMOUNT)} against no
          order — temporary, removed once real orders can be charged.
        </p>
      </div>

      <TerminalTestPanel amount={money(TEST_AMOUNT)} />
    </div>
  );
}
