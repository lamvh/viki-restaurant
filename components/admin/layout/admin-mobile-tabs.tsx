'use client';

import Link from 'next/link';

import { ADMIN_NAV, isNavItemActive } from '@/lib/admin/nav-items';

import { NavIcon } from './nav-icon';

/**
 * Bottom tab bar, shown below 820px.
 *
 * Only the "manage" group appears: the admin-only sections are unbuilt, and a
 * disabled tab on a five-across bar is pure noise on a phone.
 */
export function AdminMobileTabs({
  pathname,
  newOrderCount,
}: {
  pathname: string;
  newOrderCount: number;
}) {
  const items = ADMIN_NAV.filter((item) => item.group === 'manage');

  return (
    <nav className="no-print flex shrink-0 border-t border-admin-line bg-admin-card px-1 pb-2 pt-1.5 min-[820px]:hidden">
      {items.map((item) => {
        const active = isNavItemActive(item.href, pathname);
        const badge = item.key === 'orders' ? newOrderCount : 0;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-1 flex-col items-center gap-[3px] px-0.5 py-1.5 ${
              active ? 'text-brand' : 'text-admin-faint'
            }`}
          >
            <NavIcon path={item.iconPath} size={21} />
            <span className="text-[10.5px] font-semibold">{item.label}</span>
            {badge ? (
              <span className="absolute right-[calc(50%-22px)] top-0.5 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-lg bg-admin-red px-1 text-[9px] font-extrabold text-white">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
