import type { Metadata } from 'next';

import { TerminalTestPanel } from '@/components/admin/terminal/terminal-test-panel';
import { requireStaff } from '@/lib/auth/require-role';

export const metadata: Metadata = { title: 'Terminal test' };

export const dynamic = 'force-dynamic';

/**
 * TEMPORARY — Windcave HIT connection spike.
 *
 * Charges an arbitrary amount to the card terminal with no order and no database
 * involvement, to exercise the device before the real charge flow is built on it.
 *
 * This route is deleted once `/admin/orders` can charge a real order. A
 * permanently-mounted "charge any amount" screen is not something to leave in an
 * admin panel.
 */
export default async function TerminalTestPage() {
  await requireStaff();

  const currency = process.env.WINDCAVE_CURRENCY ?? 'NZD';

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl">Terminal test</h1>
        <p className="mt-1 text-sm text-ink/50">
          Charges the Windcave card reader directly, against no order — temporary, removed once
          real orders can be charged.
        </p>
      </div>

      <TerminalTestPanel currency={currency} />
    </div>
  );
}
