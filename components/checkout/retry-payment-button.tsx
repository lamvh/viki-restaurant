'use client';

import { useState, useTransition } from 'react';

import { retryPayment } from '@/app/(site)/checkout/actions';

/**
 * Reopens payment on a failed order. A fresh Windcave session is created — the
 * previous one is spent, and reusing it would replay the decline for ever.
 */
export function RetryPaymentButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await retryPayment(token);
      if ('error' in result) setError(result.error);
      // The hosted page is cross-origin, so router.push cannot reach it.
      else window.location.href = result.redirectUrl;
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-[var(--radius-btn)] bg-brand px-5 py-3 text-sm font-semibold text-surface disabled:opacity-50"
      >
        {pending ? 'Reopening payment…' : 'Try payment again'}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}
