import { signOut } from '@/app/admin/actions/sign-out';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-[var(--radius-btn)] border border-line px-3 py-2 text-sm font-semibold hover:border-brand"
      >
        Sign out
      </button>
    </form>
  );
}
