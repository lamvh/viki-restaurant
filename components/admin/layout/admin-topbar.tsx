import type { SessionUser } from '@/lib/auth/get-session-user';

import { SignOutButton } from '@/components/admin/auth/sign-out-button';

/** Admin top bar: current user identity + role, plus sign-out. */
export function AdminTopbar({ user }: { user: SessionUser }) {
  return (
    <header className="no-print flex items-center justify-between border-b border-line bg-surface px-6 py-4">
      <div className="text-sm">
        <span className="font-semibold text-ink">{user.email ?? 'Signed in'}</span>
        <span className="ml-2 rounded-[var(--radius-pill)] bg-surface-alt px-2 py-0.5 text-xs uppercase tracking-wide text-ink/60">
          {user.role}
        </span>
      </div>
      <SignOutButton />
    </header>
  );
}
