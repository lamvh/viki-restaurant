'use client';

import { useState, useTransition } from 'react';

import {
  advanceOrderStatus,
  chargeOrderToTerminal,
  markOrderPaidCash,
} from '@/app/admin/orders/actions';
import { canCancel, nextStatus, STATUS_LABEL, type OrderStatus } from '@/lib/orders/order-status';

import { TerminalPaymentDialog } from './terminal-payment-dialog';

/** `unpaid` and `failed` both mean not settled — either can still be resolved. */
const CHARGEABLE = ['unpaid', 'failed'];

/**
 * Everything a staff member can do to the selected order: move it along the
 * kitchen flow, settle payment, cancel it, or open the printable bill.
 *
 * This replaces the per-row control the old table used. The server actions and
 * their guards are unchanged — only where the buttons live has moved.
 */
export function OrderActions({
  orderId,
  reference,
  status,
  paymentStatus,
  hitTxnRef,
}: {
  orderId: string;
  reference: string;
  status: string;
  paymentStatus: string;
  hitTxnRef: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const next = nextStatus(status);
  const chargeable = CHARGEABLE.includes(paymentStatus);
  // Stuck mid-sale: a ref exists but nothing finalised it. Recoverable, and the
  // whole reason the ref is written before the terminal request goes out.
  const resumable = paymentStatus === 'pending' && Boolean(hitTxnRef);

  function move(to: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await advanceOrderStatus(orderId, to);
      if (!result.ok) setError(result.error);
    });
  }

  function charge() {
    setError(null);
    startTransition(async () => {
      const result = await chargeOrderToTerminal(orderId);
      if (result.ok) setDialogOpen(true);
      else setError(result.error);
    });
  }

  function settleCash() {
    setError(null);
    startTransition(async () => {
      const result = await markOrderPaidCash(orderId);
      if (result.ok) setDialogOpen(false);
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {next ? (
        <button type="button" onClick={() => move(next)} disabled={pending} className={PRIMARY}>
          {pending ? 'Working…' : `Mark ${STATUS_LABEL[next].toLowerCase()}`}
        </button>
      ) : (
        <div className="rounded-[11px] bg-admin-panel px-4 py-3.5 text-center text-sm font-semibold text-admin-muted">
          {STATUS_LABEL[status as OrderStatus] ?? status}
        </div>
      )}

      {chargeable ? (
        <div className="flex gap-2.5">
          <button type="button" onClick={charge} disabled={pending} className={`${SECONDARY} flex-1`}>
            Take card payment
          </button>
          <button
            type="button"
            onClick={settleCash}
            disabled={pending}
            className={`${SECONDARY} flex-1`}
          >
            Paid in cash
          </button>
        </div>
      ) : null}

      {resumable ? (
        <button type="button" onClick={() => setDialogOpen(true)} className={SECONDARY}>
          Resume payment
        </button>
      ) : null}

      <div className="flex gap-2.5">
        <a
          href={`/admin/orders/${orderId}/receipt`}
          target="_blank"
          rel="noreferrer"
          className={`${SECONDARY} flex-1 text-center`}
        >
          Print bill
        </a>
        {canCancel(status) ? (
          <button
            type="button"
            onClick={() => move('cancelled')}
            disabled={pending}
            className="rounded-[11px] border border-admin-red/40 bg-white px-4 py-3 text-[13.5px] font-bold text-admin-red disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-[12.5px] font-semibold text-admin-red">
          {error}
        </p>
      ) : null}

      {dialogOpen ? (
        <TerminalPaymentDialog
          orderId={orderId}
          reference={reference}
          onClose={() => setDialogOpen(false)}
          onRetry={() => {
            setDialogOpen(false);
            charge();
          }}
          onSettleCash={settleCash}
        />
      ) : null}
    </div>
  );
}

const PRIMARY =
  'w-full rounded-[11px] bg-brand px-4 py-3.5 text-sm font-bold text-white disabled:opacity-50';
const SECONDARY =
  'rounded-[11px] border border-admin-line-strong bg-white px-4 py-3 text-[13.5px] font-bold text-admin-ink disabled:opacity-50';
