'use client';

import { useMemo, useState, useTransition } from 'react';

import { chargeOrderToTerminal, markOrderPaidCash } from '@/app/admin/orders/actions';
import { createCounterOrder } from '@/app/admin/pos/actions';
import type { PosOrderResult } from '@/app/admin/pos/pos-result';
import { TerminalPaymentDialog } from '@/components/admin/orders/terminal-payment-dialog';
import { buildCartLine, defaultSelections } from '@/lib/build-cart-line';
import { totals } from '@/lib/pricing';
import type { CartLine, CheckoutLineInput } from '@/types/cart';
import type { MenuCategory, MenuItem } from '@/types/menu';

import { PosCart } from './pos-cart';
import { PosMenuGrid } from './pos-menu-grid';

type Charged = { orderId: string; reference: string };

/**
 * Counter till: ring up a walk-in, then take payment on the card terminal or in
 * cash.
 *
 * The order goes through the same `createOrder` path as an online one, so
 * pricing, the audit trail and interrupted-sale recovery are shared rather than
 * duplicated. This screen never sends a price — only item ids and quantities.
 */
export function PosScreen({ categories }: { categories: MenuCategory[] }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [charged, setCharged] = useState<Charged | null>(null);
  const [cashDone, setCashDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const t = useMemo(() => totals(lines, 'pickup'), [lines]);

  function add(item: MenuItem) {
    // Options default to the first single-select choice, matching the customer
    // modal — so an option-bearing dish still prices correctly at the counter.
    const line = buildCartLine(item, defaultSelections(item), 1, '');
    setCashDone(null);
    setLines((current) => {
      const existing = current.find((l) => l.key === line.key);
      return existing
        ? current.map((l) => (l.key === line.key ? { ...l, qty: l.qty + 1 } : l))
        : [...current, line];
    });
  }

  const inc = (key: string) =>
    setLines((c) => c.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)));

  const setNote = (key: string, notes: string) =>
    setLines((c) => c.map((l) => (l.key === key ? { ...l, notes } : l)));

  const dec = (key: string) =>
    setLines((c) =>
      c.map((l) => (l.key === key ? { ...l, qty: l.qty - 1 } : l)).filter((l) => l.qty > 0),
    );

  function reset() {
    setLines([]);
    setCustomerName('');
    setCustomerPhone('');
    setError(null);
    setCharged(null);
  }

  function submit(mode: 'terminal' | 'cash') {
    if (lines.length === 0) return;
    setError(null);
    setCashDone(null);

    const payload: CheckoutLineInput[] = lines.map((line) => ({
      itemId: line.id,
      choiceIds: line.choiceIds,
      qty: line.qty,
      notes: line.notes,
    }));

    startTransition(async () => {
      const result: PosOrderResult = await createCounterOrder(payload, mode, customerName, customerPhone);

      if (!result.ok) {
        // The order may still exist — it is listed under Orders and can be
        // retried or settled there, so the sale is never silently lost.
        setError(
          result.reference
            ? `${result.error} Order ${result.reference} is saved — finish it under Orders.`
            : result.error,
        );
        return;
      }

      if (result.charged) setCharged({ orderId: result.orderId, reference: result.reference });
      else {
        setCashDone(result.reference);
        setLines([]);
        setCustomerName('');
        setCustomerPhone('');
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <PosMenuGrid categories={categories} onAdd={add} />

      <aside className="flex h-fit flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 lg:sticky lg:top-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Current order</h2>
          {lines.length ? (
            <button type="button" onClick={reset} className="text-xs text-ink/50 underline">
              Clear
            </button>
          ) : null}
        </div>

        <PosCart lines={lines} totals={t} onInc={inc} onDec={dec} onNote={setNote} />

        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name (optional)"
            className={FIELD}
          />
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone (optional)"
            className={FIELD}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-brand">
            {error}
          </p>
        ) : null}

        {cashDone ? (
          <p className="rounded-[var(--radius-btn)] border border-brand px-3 py-2 text-sm">
            Order {cashDone} paid in cash.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => submit('terminal')}
            disabled={pending || lines.length === 0}
            className="rounded-[var(--radius-btn)] bg-brand px-4 py-3 text-sm font-semibold text-surface disabled:opacity-50"
          >
            {pending ? 'Working…' : 'Charge card terminal'}
          </button>
          <button
            type="button"
            onClick={() => submit('cash')}
            disabled={pending || lines.length === 0}
            className="rounded-[var(--radius-btn)] border border-line px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            Paid in cash
          </button>
        </div>
      </aside>

      {charged ? (
        <TerminalPaymentDialog
          orderId={charged.orderId}
          reference={charged.reference}
          onClose={reset}
          // Both act on the order that already exists. Re-running `submit` here
          // would ring up a second, duplicate sale for the same food.
          onRetry={() =>
            startTransition(async () => {
              const result = await chargeOrderToTerminal(charged.orderId);
              if (!result.ok) setError(result.error);
            })
          }
          onSettleCash={() =>
            startTransition(async () => {
              const result = await markOrderPaidCash(charged.orderId);
              if (result.ok) {
                setCashDone(charged.reference);
                reset();
              } else setError(result.error);
            })
          }
        />
      ) : null}
    </div>
  );
}

const FIELD =
  'rounded-[var(--radius-btn)] border border-line px-3 py-2 text-sm outline-none focus:border-brand';
