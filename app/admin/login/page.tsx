import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/admin/auth/login-form';
import { getSessionUser } from '@/lib/auth/get-session-user';

export const metadata: Metadata = {
  title: 'Admin login',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user) redirect('/admin');

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl">Viki Admin</h1>
        <p className="text-sm text-ink/70">Sign in to manage orders, menu and settings.</p>
      </div>
      <LoginForm />
    </main>
  );
}
