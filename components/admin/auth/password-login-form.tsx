'use client';

import { useActionState } from 'react';

import { signInWithPassword } from '@/app/admin/login/actions';
import type { AdminLoginState } from '@/app/admin/login/login-state';

/**
 * Username + password login that needs no Supabase user. Rendered only when
 * `adminLoginEnabled()` is true, so production without ADMIN_LOGIN_PASSWORD
 * never shows it.
 */
export function PasswordLoginForm({ devDefaults }: { devDefaults: boolean }) {
  const [state, formAction, pending] = useActionState<AdminLoginState, FormData>(
    signInWithPassword,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        id="username"
        label="Username"
        type="text"
        autoComplete="username"
        defaultValue={devDefaults ? 'admin' : ''}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        defaultValue={devDefaults ? 'admin' : ''}
      />

      {state?.error ? (
        <p role="alert" className="text-sm text-brand">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-btn)] bg-brand px-4 py-3 text-sm font-semibold text-surface disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      {devDefaults ? (
        <p className="rounded-[var(--radius-btn)] border border-line px-3 py-2 text-xs text-ink/60">
          <strong>Development only.</strong> Defaults to <code>admin</code> /{' '}
          <code>admin</code>. In production this form is hidden unless{' '}
          <code>ADMIN_LOGIN_PASSWORD</code> is set.
        </p>
      ) : null}
    </form>
  );
}

function Field({
  id,
  label,
  type,
  autoComplete,
  defaultValue,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  defaultValue: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="rounded-[var(--radius-btn)] border border-line px-3 py-2 text-sm outline-none focus:border-brand"
      />
    </div>
  );
}
