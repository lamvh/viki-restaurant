'use client';

import { useState, useTransition } from 'react';

import { fetchCardReceipt } from '@/app/admin/orders/receipt-actions';

/**
 * Pulls the EFTPOS receipt text from the terminal for this sale.
 *
 * The device cannot be asked to print our itemised bill — HIT's model is that
 * the terminal produces receipt content and the POS prints it. This fetches that
 * content so both end up on one piece of paper.
 */
export function FetchCardReceiptButton({
  orderId,
  hasReceipt,
}: {
  orderId: string;
  hasReceipt: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(duplicate: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await fetchCardReceipt(orderId, duplicate);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="no-print flex w-full max-w-[80mm] flex-col gap-1">
      <button
        type="button"
        onClick={() => run(hasReceipt)}
        disabled={pending}
        className="rounded-[var(--radius-btn)] border border-line px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pending
          ? 'Asking the terminal…'
          : hasReceipt
            ? 'Fetch duplicate card receipt'
            : 'Fetch card receipt from terminal'}
      </button>

      {error ? (
        <p role="alert" className="text-xs text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}
