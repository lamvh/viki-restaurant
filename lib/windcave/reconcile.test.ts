import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WindcaveSession } from './types';

/** Chainable Supabase stand-in; awaiting a chain yields the next queued result. */
const queue: unknown[] = [];
const calls: { op: string; payload?: unknown; filters: string[] }[] = [];

function chain() {
  const record = { op: 'select', payload: undefined as unknown, filters: [] as string[] };
  calls.push(record);

  const proxy: Record<string, unknown> = {};
  const method = (name: string) => (arg?: unknown, arg2?: unknown) => {
    if (name === 'update') {
      record.op = name;
      record.payload = arg;
    }
    if (name === 'eq') record.filters.push(`${String(arg)}=${String(arg2)}`);
    return proxy;
  };
  for (const n of ['select', 'update', 'insert', 'eq', 'in']) proxy[n] = method(n);
  proxy.single = () => Promise.resolve(queue.shift() ?? { data: null });
  proxy.then = (r: (v: unknown) => unknown) =>
    Promise.resolve(queue.shift() ?? { data: null }).then(r);
  return proxy;
}

vi.mock('@/lib/supabase/service-client', () => ({
  createServiceClient: () => ({ from: () => chain() }),
}));

const querySession = vi.fn();
vi.mock('./client', async () => {
  const actual = await vi.importActual<typeof import('./client')>('./client');
  return { querySession: (...a: unknown[]) => querySession(...a), formatAmount: actual.formatAmount };
});

const { reconcileSession } = await import('./reconcile');

const ORDER = { id: 'o1', total: 12.5, payment_status: 'pending', windcave_session_id: 'sess-1' };

function session(over: Partial<WindcaveSession> = {}): WindcaveSession {
  return {
    id: 'sess-1',
    state: 'complete',
    transactions: [{ id: 'txn-1', authorised: true, amount: '12.50' }],
    ...over,
  };
}

beforeEach(() => {
  queue.length = 0;
  calls.length = 0;
  querySession.mockReset();
});

afterEach(() => vi.clearAllMocks());

describe('the query is the only evidence', () => {
  it('marks paid on an authorised, amount-matching session', async () => {
    queue.push({ data: ORDER }, { data: null }, { data: [{ id: 'o1' }] }, { data: null });
    querySession.mockResolvedValue(session());

    expect(await reconcileSession('o1')).toBe('paid');

    const paid = calls.find(
      (c) => c.op === 'update' && (c.payload as Record<string, unknown>)?.payment_status === 'paid',
    );
    expect(paid?.payload).toMatchObject({ payment_method: 'card' });
    // Idempotency: only a row still at `pending` transitions.
    expect(paid?.filters).toContain('payment_status=pending');
  });

  it('refuses to fulfil when the session amount differs from the order', async () => {
    queue.push({ data: ORDER }, { data: null }, { data: null });
    querySession.mockResolvedValue(
      session({ transactions: [{ id: 't', authorised: true, amount: '5.00' }] }),
    );

    expect(await reconcileSession('o1')).toBe('mismatch');
    expect(
      calls.some((c) => c.op === 'update' && (c.payload as Record<string, unknown>)?.payment_status === 'paid'),
    ).toBe(false);
  });

  it('treats a complete-but-unauthorised session as declined, keeping it retryable', async () => {
    queue.push({ data: ORDER }, { data: null }, { data: null });
    querySession.mockResolvedValue(
      session({ transactions: [{ id: 't', authorised: false, responseText: 'DECLINED' }] }),
    );

    expect(await reconcileSession('o1')).toBe('failed');
  });

  it('leaves a still-pending session alone', async () => {
    queue.push({ data: ORDER }, { data: null });
    querySession.mockResolvedValue(session({ state: 'pending', transactions: [] }));

    expect(await reconcileSession('o1')).toBe('pending');
    expect(calls.filter((c) => c.op === 'update')).toHaveLength(0);
  });

  it('picks the authorised attempt when an earlier one declined', async () => {
    queue.push({ data: ORDER }, { data: null }, { data: [{ id: 'o1' }] }, { data: null });
    querySession.mockResolvedValue(
      session({
        transactions: [
          { id: 't1', authorised: false },
          { id: 't2', authorised: true, amount: '12.50' },
        ],
      }),
    );

    expect(await reconcileSession('o1')).toBe('paid');
  });
});

describe('idempotency and failure modes', () => {
  it('is a no-op on an order already paid, and does not even query', async () => {
    queue.push({ data: { ...ORDER, payment_status: 'paid' } });

    expect(await reconcileSession('o1')).toBe('paid');
    expect(querySession).not.toHaveBeenCalled();
    expect(calls.filter((c) => c.op === 'update')).toHaveLength(0);
  });

  it('reports pending — not failed — when the query itself errors', async () => {
    queue.push({ data: ORDER });
    querySession.mockRejectedValue(new Error('ECONNREFUSED'));

    // A network blip must never flip a payment to failed.
    expect(await reconcileSession('o1')).toBe('pending');
    expect(calls.filter((c) => c.op === 'update')).toHaveLength(0);
  });

  it('skips an order with no session', async () => {
    queue.push({ data: { ...ORDER, windcave_session_id: null } });

    expect(await reconcileSession('o1')).toBe('skipped');
    expect(querySession).not.toHaveBeenCalled();
  });
});
