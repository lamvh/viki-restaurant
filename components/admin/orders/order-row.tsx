'use client';

import { useState, useTransition } from 'react';

import { chargeOrderToTerminal, markOrderPaidCash } from '@/app/admin/orders/actions';
import { Money } from '@/components/ui/money';
import type { StaffOrder } from '@/lib/db/list-orders';

import { TerminalPaymentDialog } from './terminal-payment-dialog';

/** `unpaid` and `failed` both mean not complete — either can be resolved. */
const CHARGEABLE = ['unpaid', 'failed'];

const BADGE: Record<string, string> = {
  paid: 'border-brand text-brand',
  pending: 'border-line text-ink/70',
  unpaid: 'border-line text-ink/70',
  failed: 'border-brand text-brand',
};

export function OrderRow({ order }: { order: StaffOrder }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const chargeable = CHARGEABLE.includes(order.paymentStatus);
  // Stuck mid-sale: a ref exists but nothing finalised it — recoverable, and the
  // whole reason the ref is written before the terminal request goes out.
  const resumable = order.paymentStatus === 'pending' && Boolean(order.hitTxnRef);

  function charge() {
    setError(null);
    startTransition(async () => {
      const result = await chargeOrderToTerminal(order.id);
      if (result.ok) setDialogOpen(true);
      else setError(result.error);
    });
  }

  function settleCash() {
    setError(null);
    startTransition(async () => {
      const result = await markOrderPaidCash(order.id);
      if (!result.ok) setError(result.error);
      else setDialogOpen(false);
    });
  }

  return (
    <>
      <tr className="border-b border-line last:border-b-0">
        <td className="py-3 pr-4 font-medium">{order.reference}</td>
        <td className="py-3 pr-4 text-ink/70">
          {order.customerName ?? '—'}
          {order.customerPhone ? (
            <span className="block text-xs text-ink/40">{order.customerPhone}</span>
          ) : null}
        </td>
        <td className="py-3 pr-4 capitalize text-ink/70">{order.service}</td>
        <td className="py-3 pr-4 font-medium">
          <Money value={order.total} />
        </td>
        <td className="py-3 pr-4">
          <span
            className={`rounded-[var(--radius-pill)] border px-2 py-0.5 text-xs ${
              BADGE[order.paymentStatus] ?? 'border-line text-ink/70'
            }`}
          >
            {order.paymentStatus}
            {order.paymentStatus === 'paid' ? ` · ${order.paymentMethod}` : ''}
          </span>
        </td>
        <td className="py-3 text-right">
          <div className="flex flex-wrap justify-end gap-2">
            {chargeable ? (
              <>
                <button type="button" onClick={charge} disabled={pending} className={PRIMARY}>
                  {pending ? 'Working…' : 'Take card payment'}
                </button>
                <button
                  type="button"
                  onClick={settleCash}
                  disabled={pending}
                  className={SECONDARY}
                >
                  Mark paid (cash)
                </button>
              </>
            ) : null}

            {resumable ? (
              <button type="button" onClick={() => setDialogOpen(true)} className={SECONDARY}>
                Resume payment
              </button>
            ) : null}

            <a
              href={`/admin/orders/${order.id}/receipt`}
              target="_blank"
              rel="noreferrer"
              className={SECONDARY}
            >
              Bill
            </a>
          </div>

          {error ? (
            <p role="alert" className="mt-1 text-xs text-brand">
              {error}
            </p>
          ) : null}
        </td>
      </tr>

      {dialogOpen ? (
        <tr>
          <td colSpan={6}>
            <TerminalPaymentDialog
              orderId={order.id}
              reference={order.reference}
              onClose={() => setDialogOpen(false)}
              onRetry={() => {
                setDialogOpen(false);
                charge();
              }}
              onSettleCash={settleCash}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

const PRIMARY =
  'rounded-[var(--radius-btn)] bg-brand px-3 py-1.5 text-xs font-semibold text-surface disabled:opacity-50';
const SECONDARY =
  'rounded-[var(--radius-btn)] border border-line px-3 py-1.5 text-xs font-medium disabled:opacity-50';
