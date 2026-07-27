import type { Role } from '@/lib/auth/get-session-user';

import { AdminNavLink } from './admin-nav-link';

type NavItem = { href: string; label: string; adminOnly?: boolean; soon?: boolean };

// Only Dashboard is built today; later phases fill the rest. `soon` items render
// disabled so the nav never points at a route that 404s.
const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders', soon: true },
  { href: '/admin/menu', label: 'Menu', soon: true },
  { href: '/admin/settings', label: 'Settings', adminOnly: true, soon: true },
  { href: '/admin/users', label: 'Users', adminOnly: true, soon: true },
  // Temporary — Windcave HIT connection spike. Removed with the route once
  // /admin/orders can charge a real order.
  { href: '/admin/terminal-test', label: 'Terminal test' },
];

/** Fixed admin sidebar. Admin-only links are hidden for staff. */
export function AdminSidebar({ role }: { role: Role }) {
  const items = NAV.filter((item) => !item.adminOnly || role === 'admin');

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 border-r border-line bg-surface px-4 py-6">
      <div>
        <p className="font-display text-xl leading-none">Viki</p>
        <p className="text-xs uppercase tracking-wide text-ink/50">Admin</p>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <AdminNavLink key={item.href} href={item.href} label={item.label} soon={item.soon} />
        ))}
      </nav>
    </aside>
  );
}
