'use client';

import Link from 'next/link';

import { SignOutButton } from '@/components/admin/auth/sign-out-button';
import type { SessionUser } from '@/lib/auth/get-session-user';
import { ADMIN_NAV, isNavItemActive, type AdminNavItem } from '@/lib/admin/nav-items';

import { LockIcon, NavIcon } from './nav-icon';

function TopLink({
  item,
  pathname,
  badge,
}: {
  item: AdminNavItem;
  pathname: string;
  badge?: number;
}) {
  const active = isNavItemActive(item.href, pathname);
  const base = 'flex h-[62px] items-center gap-2 px-[14px] text-sm font-semibold border-b-2';

  if (item.soon) {
    return (
      <span className={`${base} cursor-default border-transparent text-admin-rail-faint/70`}>
        <NavIcon path={item.iconPath} size={16} />
        <span>{item.label}</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`${base} ${
        active
          ? 'border-brand text-admin-bg'
          : 'border-transparent text-admin-rail-dim hover:text-admin-bg'
      }`}
    >
      <NavIcon path={item.iconPath} size={16} />
      <span>{item.label}</span>
      {badge ? (
        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-admin-red px-[5px] text-[10px] font-extrabold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

/** Horizontal navigation — the design's alternative desktop layout. */
export function AdminTopbarNav({
  user,
  pathname,
  newOrderCount,
  onSwitchLayout,
}: {
  user: SessionUser;
  pathname: string;
  newOrderCount: number;
  onSwitchLayout: () => void;
}) {
  const manage = ADMIN_NAV.filter((item) => item.group === 'manage');
  const adminOnly = ADMIN_NAV.filter((item) => item.group === 'admin');

  return (
    <header className="no-print hidden h-[62px] shrink-0 items-center gap-[26px] bg-admin-ink px-[30px] text-admin-bg min-[820px]:flex">
      <div className="mr-1.5 flex items-baseline gap-[9px]">
        <span className="font-display text-[26px]">Viki</span>
        <span className="text-[8.5px] font-bold uppercase tracking-[1.8px] text-admin-rail-faint">
          Manager
        </span>
      </div>

      <nav className="flex h-full items-center gap-1 overflow-x-auto">
        {manage.map((item) => (
          <TopLink
            key={item.key}
            item={item}
            pathname={pathname}
            badge={item.key === 'orders' ? newOrderCount : undefined}
          />
        ))}

        {user.role === 'admin' ? (
          <>
            <span className="ml-3 mr-1 flex items-center gap-[5px] border-l border-admin-bg/16 pl-3 text-[8.5px] font-extrabold uppercase tracking-[1.4px] text-admin-gold">
              <LockIcon />
              Admin
            </span>
            {adminOnly.map((item) => (
              <TopLink key={item.key} item={item} pathname={pathname} />
            ))}
          </>
        ) : null}
      </nav>

      <div className="ml-auto flex items-center gap-[14px]">
        <button
          type="button"
          onClick={onSwitchLayout}
          className="flex items-center gap-[7px] rounded-full border border-admin-bg/20 px-3 py-[7px] text-xs text-admin-rail-bright hover:border-admin-bg/40"
        >
          <NavIcon path="M4 6h16M4 12h16M4 18h16" size={14} />
          Topbar
        </button>
        <div className="[&_button]:border-admin-bg/20 [&_button]:py-1.5 [&_button]:text-xs [&_button]:text-admin-rail-bright [&_button]:hover:border-admin-bg/40">
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
