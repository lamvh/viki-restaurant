import Link from 'next/link';

import type { QueueEntry } from '@/lib/admin/dashboard-aggregate';
import { STATUS_META } from '@/lib/admin/status-meta';

/** Dark "what is on the pass right now" panel, with a jump into Orders. */
export function LiveKitchenPanel({ queue }: { queue: QueueEntry[] }) {
  return (
    <div className="flex flex-col rounded-[14px] bg-admin-ink px-[22px] py-5 text-admin-bg">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-[15.5px] font-bold">Live kitchen</h2>
        <span className="text-[11px] text-admin-rail-faint">now</span>
      </div>

      {queue.map((entry) => {
        const meta = STATUS_META[entry.status];
        return (
          <div
            key={entry.status}
            className="flex items-center gap-3 border-b border-admin-bg/10 py-3"
          >
            <span
              className="h-[9px] w-[9px] shrink-0 rounded-full"
              style={{ backgroundColor: meta.dot }}
            />
            <span className="flex-1 text-sm text-[#e6dcc9]">{meta.label}</span>
            <span className="font-display text-[26px] leading-none">{entry.count}</span>
          </div>
        );
      })}

      <Link
        href="/admin/orders"
        className="mt-auto rounded-[10px] bg-brand px-4 py-3 text-center text-[13.5px] font-bold text-white hover:opacity-90"
      >
        Go to orders →
      </Link>
    </div>
  );
}
