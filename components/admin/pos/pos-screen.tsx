'use client';

import { useMemo, useState, useTransition } from 'react';

import { chargeOrderToTerminal, markOrderPaidCash } from '@/app/admin/orders/actions';
import { createCounterOrder } from '@/app/admin/pos/actions';
import type { PosOrderResult } from '@/app/admin/pos/pos-result';
import { TerminalPaymentDialog } from '@/components/admin/orders/terminal-payment-dialog';
import { buildCartLine, defaultSelections } from '@/lib/build-cart-line';
import { money } from '@/lib/format';
import { totals } from '@/lib/pricing';
import type { CartLine, CheckoutLineInput } from '@/types/cart';
import type { MenuCategory, MenuItem } from '@/types/menu';

import { PosPaymentSheet } from './pos-payment-sheet';
import { PosTicketPanel } from './pos-ticket-panel';
import { PosTileGrid } from './pos-tile-grid';

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
  const [methodOpen, setMethodOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Counter sales are recorded as `pickup`: there is no dine-in service in the
  // schema, and the customer is standing at the counter either way.
  const t = useMemo(() => totals(lines, 'pickup'), [lines]);

  const quantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of lines) map[line.id] = (map[line.id] ?? 0) + line.qty;
    return map;
  }, [lines]);

  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0);

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
    setMethodOpen(false);
    setTicketOpen(false);
  }

  function submit(mode: 'terminal' | 'cash') {
    if (lines.length === 0) return;
    setError(null);
    setCashDone(null);
    setMethodOpen(false);

    const payload: CheckoutLineInput[] = lines.map((line) => ({
      itemId: line.id,
      choiceIds: line.choiceIds,
      qty: line.qty,
      notes: line.notes,
    }));

    startTransition(async () => {
      const result: PosOrderResult = await createCounterOrder(
        payload,
        mode,
        customerName,
        customerPhone,
      );

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
        setTicketOpen(false);
      }
    });
  }

  return (
    <div className="flex h-full flex-col bg-admin-bg">
      <div className="flex shrink-0 flex-wrap items-center gap-3 px-4 pb-3 pt-4 min-[820px]:px-[30px] min-[820px]:pt-5">
        <div className="mr-1.5 hidden min-[820px]:block">
          <h1 className="font-display text-[28px] leading-[1.05]">Counter</h1>
          <p className="text-[12.5px] text-admin-muted">Take walk-in orders at the till</p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
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
      </div>

      {error ? (
        <p
          role="alert"
          className="mx-4 mb-3 shrink-0 rounded-[10px] border border-admin-red/30 bg-[#F7E3DF] px-4 py-3 text-[13px] font-semibold text-admin-red min-[820px]:mx-[30px]"
        >
          {error}
        </p>
      ) : null}

      {cashDone ? (
        <p className="mx-4 mb-3 shrink-0 rounded-[10px] border border-brand/30 bg-[#DFF0E6] px-4 py-3 text-[13px] font-semibold text-[#256045] min-[820px]:mx-[30px]">
          Order {cashDone} paid in cash.
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 min-[1120px]:grid-cols-[1fr_360px]">
        <PosTileGrid categories={categories} quantities={quantities} onAdd={add} />

        {/* The ticket sits beside the grid on a wide till and collapses to a
            summary bar plus sheet on anything narrower. */}
        <aside className="hidden min-h-0 flex-col border-l border-admin-line bg-admin-card min-[1120px]:flex">
          <PosTicketPanel
            lines={lines}
            totals={t}
            onInc={inc}
            onDec={dec}
            onNote={setNote}
            onClear={reset}
            onPay={() => setMethodOpen(true)}
            pending={pending}
          />
        </aside>
      </div>

      <div className="flex shrink-0 items-center gap-3 bg-admin-ink px-4 py-2.5 text-admin-bg min-[1120px]:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] text-admin-rail-bright">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} · counter
          </p>
          <p className="font-display text-[25px] leading-tight">{money(t.total)}</p>
        </div>
        <button
          type="button"
          onClick={() => setTicketOpen(true)}
          disabled={lines.length === 0}
          className="rounded-[11px] bg-brand px-5 py-3.5 text-[14.5px] font-bold text-white disabled:opacity-50"
        >
          Review ticket
        </button>
      </div>

      {ticketOpen ? (
        <div className="fixed inset-0 z-85 flex flex-col bg-admin-bg min-[1120px]:hidden">
          <div className="flex h-[54px] shrink-0 items-center gap-3 bg-admin-ink px-4 text-admin-bg">
            <button
              type="button"
              onClick={() => setTicketOpen(false)}
              aria-label="Back to dishes"
              className="h-[34px] w-[34px] rounded-[9px] bg-admin-bg/15 text-lg"
            >
              ←
            </button>
            <div className="flex-1">
              <p className="text-[15px] font-extrabold">Ticket</p>
              <p className="text-[11px] text-admin-rail-bright">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded-[9px] border border-admin-bg/25 px-3 py-[7px] text-xs font-bold text-admin-rail-bright"
            >
              Clear
            </button>
          </div>
          <PosTicketPanel
            lines={lines}
            totals={t}
            onInc={inc}
            onDec={dec}
            onNote={setNote}
            onClear={reset}
            onPay={() => setMethodOpen(true)}
            pending={pending}
            compact
          />
        </div>
      ) : null}

      {methodOpen ? (
        <PosPaymentSheet
          total={t.total}
          pending={pending}
          onCard={() => submit('terminal')}
          onCash={() => submit('cash')}
          onClose={() => setMethodOpen(false)}
        />
      ) : null}

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
  'rounded-[10px] border border-admin-line-strong bg-admin-card px-3 py-2.5 text-[13px] outline-none focus:border-brand';
