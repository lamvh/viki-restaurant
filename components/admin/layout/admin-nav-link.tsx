'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Sidebar nav link with active-state highlight. Unbuilt sections render as a
 * disabled "soon" row so the nav never links to a 404.
 */
export function AdminNavLink({
  href,
  label,
  soon = false,
}: {
  href: string;
  label: string;
  soon?: boolean;
}) {
  const pathname = usePathname();

  if (soon) {
    return (
      <span className="flex items-center justify-between rounded-[var(--radius-btn)] px-3 py-2 text-sm text-ink/35">
        {label}
        <span className="text-[10px] uppercase tracking-wide text-ink/30">soon</span>
      </span>
    );
  }

  const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`rounded-[var(--radius-btn)] px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-brand text-surface' : 'text-ink/70 hover:bg-surface-alt hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );
}
