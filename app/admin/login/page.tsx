import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/admin/auth/login-form';
import { PasswordLoginForm } from '@/components/admin/auth/password-login-form';
import { adminLoginEnabled, usingDevDefaults } from '@/lib/auth/admin-session';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = {
  title: 'Admin login',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user) redirect('/admin');

  const passwordLogin = adminLoginEnabled();
  const devDefaults = usingDevDefaults();
  // Only offer the Supabase form when it could actually work.
  const supabaseLogin = isSupabaseConfigured();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl">Viki Admin</h1>
        <p className="text-sm text-ink/70">Sign in to manage orders, menu and settings.</p>
      </div>

      {/* One visible form. When both methods work, password is primary and the
          Supabase form stays collapsed — showing two identical-looking forms
          just makes people guess which one is theirs. */}
      {passwordLogin ? <PasswordLoginForm devDefaults={devDefaults} /> : null}

      {supabaseLogin && !passwordLogin ? <LoginForm /> : null}

      {supabaseLogin && passwordLogin ? (
        <details className="border-t border-line pt-4">
          <summary className="cursor-pointer text-sm text-ink/60">
            Sign in with a Supabase account instead
          </summary>
          <div className="pt-4">
            <LoginForm />
          </div>
        </details>
      ) : null}

      {!passwordLogin && !supabaseLogin ? (
        <p className="rounded-[var(--radius-btn)] border border-line px-3 py-2 text-sm text-ink/70">
          No sign-in method is configured. Set <code>ADMIN_LOGIN_PASSWORD</code>, or configure
          Supabase Auth — see <code>docs/deployment-guide.md</code>.
        </p>
      ) : null}
    </main>
  );
}
