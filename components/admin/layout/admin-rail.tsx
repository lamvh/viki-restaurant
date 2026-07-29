'use client';

import Link from 'next/link';

import { SignOutButton } from '@/components/admin/auth/sign-out-button';
import type { SessionUser } from '@/lib/auth/get-session-user';
import { ADMIN_NAV, isNavItemActive, type AdminNavItem } from '@/lib/admin/nav-items';

import { LockIcon, NavIcon } from './nav-icon';

/** Two-letter monogram for the identity chip. */
function initials(user: SessionUser): string {
  const source = user.email ?? 'Viki';
  const local = source.split('@')[0];
  const parts = local.split(/[.\-_\s]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return letters.toUpperCase();
}

function RailLink({
  item,
  pathname,
  badge,
}: {
  item: AdminNavItem;
  pathname: string;
  badge?: number;
}) {
  const active = isNavItemActive(item.href, pathname);
  const base =
    'mb-[3px] flex items-center gap-[11px] rounded-[10px] px-3 py-[11px] text-sm font-semibold transition-colors';

  if (item.soon) {
    return (
      <span className={`${base} cursor-default text-admin-rail-faint/70`}>
        <NavIcon path={item.iconPath} />
        <span className="flex-1">{item.label}</span>
        <span className="text-[10px] uppercase tracking-wide">soon</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`${base} ${
        active
          ? 'bg-admin-bg/15 text-admin-bg shadow-[inset_3px_0_0_var(--color-brand)]'
          : 'text-admin-rail-dim hover:bg-admin-bg/8 hover:text-admin-bg'
      }`}
    >
      <NavIcon path={item.iconPath} />
      <span className="flex-1">{item.label}</span>
      {badge ? (
        <span className="inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-[10px] bg-admin-red px-[5px] text-[10.5px] font-extrabold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Dark navigation rail — the design's default desktop layout.
 *
 * Hidden below 820px, where the mobile header and bottom tabs take over.
 */
export function AdminRail({
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
    <aside className="no-print hidden w-[236px] shrink-0 flex-col overflow-y-auto bg-admin-ink px-4 pb-4 pt-[22px] text-admin-bg min-[820px]:flex">
      <div className="mb-4 flex items-center gap-[10px] border-b border-admin-bg/12 px-2 pb-[22px]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-admin-red">
          <span className="font-display text-2xl leading-none text-admin-bg">V</span>
        </div>
        <div className="leading-tight">
          <p className="font-display text-[22px]">Viki</p>
          <p className="text-[8px] font-bold uppercase tracking-[1.5px] text-admin-rail-faint">
            Manager
          </p>
        </div>
      </div>

      <p className="px-[10px] pb-2 text-[9.5px] font-bold uppercase tracking-[1.5px] text-admin-rail-faint/80">
        Manage
      </p>
      {manage.map((item) => (
        <RailLink
          key={item.key}
          item={item}
          pathname={pathname}
          badge={item.key === 'orders' ? newOrderCount : undefined}
        />
      ))}

      {/* Admin-only sections are visible to admins alone — matching the previous
          sidebar's rule — and are rendered disabled until they are built. */}
      {user.role === 'admin' ? (
        <>
          <p className="flex items-center gap-[7px] px-[10px] pb-2 pt-[18px] text-[9.5px] font-bold uppercase tracking-[1.5px] text-admin-rail-faint/80">
            <span className="text-admin-gold">
              <LockIcon />
            </span>
            Admin
          </p>
          {adminOnly.map((item) => (
            <RailLink key={item.key} item={item} pathname={pathname} />
          ))}
        </>
      ) : null}

      <div className="mt-auto border-t border-admin-bg/12 pt-[14px]">
        <button
          type="button"
          onClick={onSwitchLayout}
          className="flex w-full items-center gap-[9px] rounded-[9px] px-[10px] py-[9px] text-[12.5px] text-admin-rail-bright hover:bg-admin-bg/8"
        >
          <NavIcon path="M4 6h16M4 12h16M4 18h16" size={16} />
          <span className="flex-1 text-left">
            Layout · <span className="font-semibold text-admin-bg">Sidebar</span>
          </span>
          <span className="text-[10px] text-admin-rail-faint">switch</span>
        </button>

        <div className="flex items-center gap-[9px] px-[10px] py-[9px]">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#3B5A45] text-xs font-bold text-admin-bg">
            {initials(user)}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[12.5px] font-semibold">{user.email ?? 'Signed in'}</p>
            <p className="text-[10.5px] capitalize text-admin-rail-faint">Glenfield · {user.role}</p>
          </div>
        </div>

        <div className="px-[10px] pt-1 [&_button]:w-full [&_button]:border-admin-bg/20 [&_button]:text-[12.5px] [&_button]:text-admin-rail-bright [&_button]:hover:border-admin-bg/40">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
