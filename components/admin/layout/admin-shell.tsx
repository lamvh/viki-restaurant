'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import type { SessionUser } from '@/lib/auth/get-session-user';
import { sectionMetaFor } from '@/lib/admin/nav-items';

import { AdminMobileTabs } from './admin-mobile-tabs';
import { AdminRail } from './admin-rail';
import { AdminTopbarNav } from './admin-topbar-nav';

type Layout = 'sidebar' | 'topbar';

const LAYOUT_KEY = 'viki.admin.layout';

/**
 * Admin chrome: navigation, mobile header, and the scroll container pages
 * render into.
 *
 * The rail/topbar choice is a per-device preference, so it lives in
 * `localStorage` rather than on the session. The first paint always renders the
 * sidebar — reading storage during render would differ between server and
 * client and break hydration.
 *
 * Which chrome is *visible* is decided by CSS at the design's 820px breakpoint,
 * not by measuring `window.innerWidth`. That keeps the markup identical on both
 * sides of hydration and keeps resizing free.
 */
export function AdminShell({
  user,
  newOrderCount,
  children,
}: {
  user: SessionUser;
  newOrderCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [layout, setLayout] = useState<Layout>('sidebar');

  useEffect(() => {
    const stored = window.localStorage.getItem(LAYOUT_KEY);
    if (stored === 'sidebar' || stored === 'topbar') setLayout(stored);
  }, []);

  function switchLayout() {
    setLayout((current) => {
      const next = current === 'sidebar' ? 'topbar' : 'sidebar';
      window.localStorage.setItem(LAYOUT_KEY, next);
      return next;
    });
  }

  const section = sectionMetaFor(pathname);

  // The till is a full-height two-pane workspace: it manages its own scrolling
  // and must not sit inside the standard padded, page-scrolling container.
  const isFullBleed = pathname.startsWith('/admin/pos');

  return (
    <div className="flex h-screen overflow-hidden bg-admin-bg text-admin-ink">
      {layout === 'sidebar' ? (
        <AdminRail
          user={user}
          pathname={pathname}
          newOrderCount={newOrderCount}
          onSwitchLayout={switchLayout}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {layout === 'topbar' ? (
          <AdminTopbarNav
            user={user}
            pathname={pathname}
            newOrderCount={newOrderCount}
            onSwitchLayout={switchLayout}
          />
        ) : null}

        <header className="no-print flex h-[54px] shrink-0 items-center gap-3 bg-admin-ink px-4 text-admin-bg min-[820px]:hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-admin-red">
            <span className="font-display text-[19px] leading-none">V</span>
          </div>
          <p className="flex-1 truncate font-display text-xl">{section?.title ?? 'Viki'}</p>
        </header>

        <main
          className={
            isFullBleed
              ? 'min-h-0 flex-1 overflow-hidden bg-admin-bg'
              : 'min-h-0 flex-1 overflow-y-auto bg-admin-bg px-4 py-5 min-[820px]:px-[30px] min-[820px]:pb-8 min-[820px]:pt-5'
          }
        >
          {children}
        </main>

        <AdminMobileTabs pathname={pathname} newOrderCount={newOrderCount} />
      </div>
    </div>
  );
}
