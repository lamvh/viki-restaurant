/**
 * The admin navigation, as one list.
 *
 * The rail, the topbar and the mobile tab bar all render from this — three
 * copies of the same menu is exactly the kind of thing that drifts.
 */
export type AdminNavItem = {
  key: string;
  href: string;
  label: string;
  /** 24×24 stroke path, from the admin design. */
  iconPath: string;
  group: 'manage' | 'admin';
  /** Designed but not built. Renders disabled so the nav never links to a 404. */
  soon?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  {
    key: 'overview',
    href: '/admin',
    label: 'Overview',
    group: 'manage',
    iconPath: 'M4 4h6v7H4zM14 4h6v4h-6zM14 12h6v8h-6zM4 15h6v5H4z',
  },
  {
    key: 'pos',
    href: '/admin/pos',
    label: 'Counter',
    group: 'manage',
    iconPath: 'M4 7h16l-1.3 11.2a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8zM9 7V5.5a3 3 0 0 1 6 0V7M9.5 12h5',
  },
  {
    key: 'orders',
    href: '/admin/orders',
    label: 'Orders',
    group: 'manage',
    iconPath: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  },
  {
    key: 'menu',
    href: '/admin/menu',
    label: 'Menu',
    group: 'manage',
    iconPath:
      'M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6zM7.5 7.5h.01',
  },
  {
    key: 'content',
    href: '/admin/content',
    label: 'Content',
    group: 'admin',
    soon: true,
    iconPath: 'M3 4h18v16H3zM3 9h18M9 9v11',
  },
  {
    key: 'payments',
    href: '/admin/payments',
    label: 'Payments',
    group: 'admin',
    soon: true,
    iconPath: 'M2 7h20v12H2zM2 11h20M6 15h4',
  },
  {
    key: 'report',
    href: '/admin/report',
    label: 'End of day',
    group: 'admin',
    soon: true,
    iconPath: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h4',
  },
  {
    key: 'print',
    href: '/admin/printers',
    label: 'Printers',
    group: 'admin',
    soon: true,
    iconPath:
      'M7 9V3h10v6M7 18H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v7H7z',
  },
];

export type SectionMeta = { title: string; sub: string };

const SECTION_META: Record<string, SectionMeta> = {
  '/admin': { title: 'Overview', sub: 'Today at Glenfield' },
  '/admin/pos': { title: 'Counter', sub: 'Take walk-in orders at the till' },
  '/admin/orders': { title: 'Orders', sub: 'Live queue and history' },
  '/admin/menu': { title: 'Menu & products', sub: 'Prices, availability and dishes' },
};

/**
 * Whether a nav item is the one the current path belongs to.
 *
 * `/admin` has to match exactly — every admin route starts with it, so a prefix
 * test would light up Overview on every single page.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

/** Title bar copy for a path, or null for routes that render their own header. */
export function sectionMetaFor(pathname: string): SectionMeta | null {
  const match = ADMIN_NAV.find((item) => isNavItemActive(item.href, pathname));
  return match ? (SECTION_META[match.href] ?? null) : null;
}
