import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HitStatus } from '@/lib/windcave/hit-types';

/**
 * A minimal stand-in for the Supabase query builder: every method returns the
 * chain, and awaiting it (or calling `.single()`) yields the next queued result.
 * Each chain also records the payload it was built with, so tests can assert on
 * the conditional-update guards that make this module idempotent.
 */
const queue: unknown[] = [];
const calls: { table: string; op: string; payload?: unknown; filters: string[] }[] = [];

function chain(table: string) {
  const record = { table, op: 'select', payload: undefined as unknown, filters: [] as string[] };
  calls.push(record);

  const proxy: Record<string, unknown> = {};
  const method = (name: string) => (arg?: unknown, arg2?: unknown) => {
    if (name === 'update' || name === 'insert') {
      record.op = name;
      record.payload = arg;
    }
    if (name === 'eq' || name === 'in') record.filters.push(`${name}:${String(arg)}=${String(arg2)}`);
    return proxy;
  };

  for (const name of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'limit']) {
    proxy[name] = method(name);
  }
  proxy.single = () => Promise.resolve(queue.shift() ?? { data: null });
  proxy.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(queue.shift() ?? { data: null }).then(resolve);

  return proxy;
}

vi.mock('@/lib/supabase/service-client', () => ({
  createServiceClient: () => ({ from: (table: string) => chain(table) }),
}));

const startPurchase = vi.fn();
const pollStatus = vi.fn();
const sendButton = vi.fn();

vi.mock('@/lib/windcave/hit-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/windcave/hit-xml')>(
    '@/lib/windcave/hit-xml',
  );
  return {
    startPurchase: (...a: unknown[]) => startPurchase(...a),
    pollStatus: (...a: unknown[]) => pollStatus(...a),
    sendButton: (...a: unknown[]) => sendButton(...a),
    formatHitAmount: actual.formatHitAmount,
    centsMatch: actual.centsMatch,
  };
});

const { finaliseTerminalPayment, settleOrderAsCash, startTerminalPayment } = await import(
  './terminal-payment'
);

const ORDER = { id: 'o1', reference: 'VK-7KQ2X9', total: 12.5, payment_status: 'unpaid', hit_attempt: 0 };

function completed(over: Partial<NonNullable<HitStatus['result']>> = {}): HitStatus {
  return {
    complete: true,
    result: { authorised: true, amountCents: 1250, transactionId: 'txn-1', ...over },
  };
}

beforeEach(() => {
  queue.length = 0;
  calls.length = 0;
  startPurchase.mockReset().mockResolvedValue({ complete: false });
  pollStatus.mockReset();
  sendButton.mockReset();
});

afterEach(() => vi.clearAllMocks());

describe('startTerminalPayment', () => {
  it('writes the TxnRef BEFORE contacting the terminal', async () => {
    queue.push({ data: ORDER }, { data: [{ id: 'o1' }] }, { data: null });

    await startTerminalPayment('o1');

    const update = calls.find((c) => c.op === 'update');
    // If this ever moves after the request, a crash mid-call loses the only
    // handle on a card that may already have been charged.
    expect(update?.payload).toMatchObject({ hit_txn_ref: 'VK-7KQ2X9-1', hit_attempt: 1 });
    expect(calls.indexOf(update!)).toBeLessThan(calls.length);
    expect(startPurchase).toHaveBeenCalledOnce();
  });

  it('charges the amount from the order, not from any caller input', async () => {
    queue.push({ data: ORDER }, { data: [{ id: 'o1' }] }, { data: null });

    await startTerminalPayment('o1');

    expect(startPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '12.50', txnRef: 'VK-7KQ2X9-1' }),
    );
  });

  it('allocates a new ref per attempt so a decline is not replayed', async () => {
    queue.push({ data: { ...ORDER, payment_status: 'failed', hit_attempt: 2 } }, { data: [{ id: 'o1' }] }, { data: null });

    await startTerminalPayment('o1');

    expect(startPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ txnRef: 'VK-7KQ2X9-3' }),
    );
  });

  it('claims the order with a conditional update, so a concurrent charge loses', async () => {
    queue.push({ data: ORDER }, { data: [] });

    const result = await startTerminalPayment('o1');

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/busy/i);
    expect(startPurchase).not.toHaveBeenCalled();
  });

  it('refuses an order that is already paid', async () => {
    queue.push({ data: { ...ORDER, payment_status: 'paid' } });

    expect(await startTerminalPayment('o1')).toMatchObject({ ok: false });
    expect(startPurchase).not.toHaveBeenCalled();
  });

  it('releases the claim when the terminal is unreachable', async () => {
    queue.push({ data: ORDER }, { data: [{ id: 'o1' }] }, { data: null }, { data: null });
    startPurchase.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await startTerminalPayment('o1');

    expect(result).toMatchObject({ ok: false });
    // Back to a chargeable state — otherwise the order is stuck for ever.
    expect(calls.some((c) => c.op === 'update' && (c.payload as Record<string, unknown>)?.payment_status === 'failed')).toBe(true);
  });
});

describe('finaliseTerminalPayment', () => {
  it('marks an authorised, amount-matching sale paid via a conditional update', async () => {
    queue.push({ data: { id: 'o1', total: 12.5, payment_status: 'pending' } }, { data: null }, { data: null });

    expect(await finaliseTerminalPayment('o1', 'VK-7KQ2X9-1', completed())).toBe('paid');

    const paid = calls.find(
      (c) => c.op === 'update' && (c.payload as Record<string, unknown>)?.payment_status === 'paid',
    );
    expect(paid?.payload).toMatchObject({ payment_method: 'terminal' });
    // Idempotency: only transitions a row still sitting at `pending`.
    expect(paid?.filters).toContain('eq:payment_status=pending');
  });

  it('refuses to fulfil when the terminal reports a different amount', async () => {
    queue.push({ data: { id: 'o1', total: 12.5, payment_status: 'pending' } }, { data: null }, { data: null });

    const status = completed({ amountCents: 1500 });
    expect(await finaliseTerminalPayment('o1', 'VK-7KQ2X9-1', status)).toBe('mismatch');

    expect(
      calls.some((c) => c.op === 'update' && (c.payload as Record<string, unknown>)?.payment_status === 'paid'),
    ).toBe(false);
  });

  it('is a no-op on an order that is already paid', async () => {
    queue.push({ data: { id: 'o1', total: 12.5, payment_status: 'paid' } });

    expect(await finaliseTerminalPayment('o1', 'VK-7KQ2X9-1', completed())).toBe('paid');
    expect(calls.filter((c) => c.op === 'update')).toHaveLength(0);
  });

  it('marks a declined sale failed, leaving it chargeable again', async () => {
    queue.push({ data: { id: 'o1', total: 12.5, payment_status: 'pending' } }, { data: null }, { data: null });

    const declined: HitStatus = { complete: true, result: { authorised: false, responseText: 'DECLINED' } };
    expect(await finaliseTerminalPayment('o1', 'VK-7KQ2X9-1', declined)).toBe('failed');

    expect(
      calls.some((c) => c.op === 'update' && (c.payload as Record<string, unknown>)?.payment_status === 'failed'),
    ).toBe(true);
  });
});

describe('settleOrderAsCash', () => {
  it('settles an incomplete order and records it', async () => {
    queue.push({ data: [{ id: 'o1' }] }, { data: null });

    expect(await settleOrderAsCash('o1')).toMatchObject({ ok: true });

    const update = calls.find((c) => c.op === 'update');
    expect(update?.payload).toMatchObject({ payment_status: 'paid', payment_method: 'cash' });
    // Cannot overwrite a sale that completed on the terminal a moment earlier.
    expect(update?.filters.some((f) => f.startsWith('in:payment_status'))).toBe(true);
  });

  it('refuses an order that is not awaiting payment', async () => {
    queue.push({ data: [] });

    expect(await settleOrderAsCash('o1')).toMatchObject({ ok: false });
  });
});
