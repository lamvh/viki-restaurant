import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { SessionUser } from '@/lib/auth/get-session-user';

import { AdminShell } from './admin-shell';

// The shell reads the current route to decide the active nav item and the
// mobile header's title.
const pathname = vi.hoisted(() => ({ current: '/admin' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

// Sign-out posts a server action, which has no meaning under jsdom.
vi.mock('@/app/admin/actions/sign-out', () => ({ signOut: vi.fn() }));

const ADMIN: SessionUser = { id: 'u1', email: 'hoa.le@viki.co.nz', role: 'admin' };
const STAFF: SessionUser = { id: 'u2', email: 'sam@viki.co.nz', role: 'staff' };

function renderShell(user: SessionUser = ADMIN, newOrderCount = 0) {
  return render(
    <AdminShell user={user} newOrderCount={newOrderCount}>
      <p>page body</p>
    </AdminShell>,
  );
}

describe('AdminShell', () => {
  beforeEach(() => {
    localStorage.clear();
    pathname.current = '/admin';
  });

  it('renders the page body inside the chrome', () => {
    renderShell();
    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  it('links every built section', () => {
    renderShell();
    const rail = screen.getByRole('complementary');

    for (const [label, href] of [
      ['Overview', '/admin'],
      ['Counter', '/admin/pos'],
      ['Orders', '/admin/orders'],
      ['Menu', '/admin/menu'],
    ] as const) {
      expect(within(rail).getByRole('link', { name: new RegExp(label) })).toHaveAttribute(
        'href',
        href,
      );
    }
  });

  it('marks the current section, matching /admin exactly', () => {
    pathname.current = '/admin/orders';
    renderShell();

    const rail = screen.getByRole('complementary');
    expect(within(rail).getByRole('link', { name: /Orders/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // Every admin path starts with /admin — Overview must not light up too.
    expect(within(rail).getByRole('link', { name: /Overview/ })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('shows the new-order count on the Orders item', () => {
    renderShell(ADMIN, 3);
    const rail = screen.getByRole('complementary');
    expect(within(rail).getByRole('link', { name: /Orders/ })).toHaveTextContent('3');
  });

  it('hides unbuilt admin sections from staff', () => {
    renderShell(STAFF);
    const rail = screen.getByRole('complementary');

    expect(within(rail).queryByText('Payments')).not.toBeInTheDocument();
    expect(within(rail).getByRole('link', { name: /Orders/ })).toBeInTheDocument();
  });

  it('shows unbuilt admin sections to admins, but never as links', () => {
    renderShell(ADMIN);
    const rail = screen.getByRole('complementary');

    expect(within(rail).getByText('Payments')).toBeInTheDocument();
    expect(within(rail).queryByRole('link', { name: /Payments/ })).not.toBeInTheDocument();
  });

  it('remembers the layout choice across a remount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderShell();

    // Sidebar is the default, so the rail is what renders first.
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Layout/ }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();

    unmount();
    renderShell();
    expect(await screen.findByRole('button', { name: /Topbar/ })).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('titles the mobile header from the current route', () => {
    pathname.current = '/admin/menu';
    renderShell();
    expect(screen.getByText('Menu & products')).toBeInTheDocument();
  });
});
