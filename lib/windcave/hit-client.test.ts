import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HitError, pollStatus, sendButton, startPurchase } from './hit-client';

const KEY = 'super-secret-hit-key';

const OK_BODY = '<Scr><Complete>0</Complete><DL1>PRESENT/INSERT</DL1></Scr>';

function mockFetch(body: string, init: { ok?: boolean; status?: number } = {}) {
  // Parameters are declared so `mock.calls` types as a 2-tuple, not `[]`.
  const fn = vi.fn(async (_url: string, _init: RequestInit) => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => body,
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** The XML body sent on the first call. */
function sentBody(fn: ReturnType<typeof mockFetch>): string {
  return fn.mock.calls[0][1].body as string;
}

beforeEach(() => {
  vi.stubEnv('WINDCAVE_HIT_URL', 'https://uat.windcave.com/hit/pos.aspx');
  vi.stubEnv('WINDCAVE_HIT_USER', 'VikiUAT');
  vi.stubEnv('WINDCAVE_HIT_KEY', KEY);
  vi.stubEnv('WINDCAVE_HIT_STATION', '3425240086');
  vi.stubEnv('WINDCAVE_HIT_POS_NAME', 'Viki');
  vi.stubEnv('WINDCAVE_HIT_VENDOR_ID', 'VND123');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('startPurchase', () => {
  it('posts a Purchase to the configured endpoint', async () => {
    const fetchMock = mockFetch(OK_BODY);

    await startPurchase({ amount: '12.50', currency: 'NZD', txnRef: 'VK-7KQ2X9-1' });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('https://uat.windcave.com/hit/pos.aspx');

    const body = sentBody(fetchMock);
    expect(body).toContain('<TxnType>Purchase</TxnType>');
    expect(body).toContain('<TxnRef>VK-7KQ2X9-1</TxnRef>');
    expect(body).toContain('<Station>3425240086</Station>');
  });

  it('sends the amount as a string, never a bare number', async () => {
    const fetchMock = mockFetch(OK_BODY);

    await startPurchase({ amount: '12.50', currency: 'NZD', txnRef: 'VK-1' });

    expect(sentBody(fetchMock)).toContain('<Amount>12.50</Amount>');
  });

  it('parses the response into a status', async () => {
    mockFetch(OK_BODY);

    const status = await startPurchase({ amount: '1.00', currency: 'NZD', txnRef: 'VK-1' });

    expect(status.complete).toBe(false);
    expect(status.dl1).toBe('PRESENT/INSERT');
  });
});

describe('pollStatus', () => {
  it('posts a Status request carrying the same TxnRef', async () => {
    const fetchMock = mockFetch(OK_BODY);

    await pollStatus('VK-7KQ2X9-1');

    const body = sentBody(fetchMock);
    expect(body).toContain('<TxnType>Status</TxnType>');
    expect(body).toContain('<TxnRef>VK-7KQ2X9-1</TxnRef>');
  });
});

describe('sendButton', () => {
  it('relays a press as a separate UI transaction, not a Status field', async () => {
    const fetchMock = mockFetch(OK_BODY);

    await sendButton('VK-7KQ2X9-1', 'B2', 'CANCEL');

    const body = sentBody(fetchMock);
    expect(body).toContain('<TxnType>UI</TxnType>');
    expect(body).toContain('<UiType>Bn</UiType>');
    expect(body).toContain('<Name>B2</Name>');
    expect(body).toContain('<Val>CANCEL</Val>');
    expect(body).not.toContain('<TxnType>Status</TxnType>');
  });
});

describe('errors', () => {
  it('raises HitError with the status on a non-2xx response', async () => {
    mockFetch('unauthorised', { ok: false, status: 401 });

    await expect(pollStatus('VK-1')).rejects.toMatchObject({
      name: 'HitError',
      status: 401,
    });
  });

  it('distinguishes a transport failure from a decline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );

    await expect(pollStatus('VK-1')).rejects.toThrow(/Terminal request failed/);
  });

  it('raises rather than returning a half-parsed object on malformed XML', async () => {
    mockFetch('<html>gateway down</html>');

    await expect(pollStatus('VK-1')).rejects.toThrow(/malformed XML/);
  });

  it('never leaks the API key in an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );

    // The request body carries the key as a root attribute, so an error that
    // echoed the body would put the credential into logs.
    const error = (await pollStatus('VK-1').catch((e: unknown) => e)) as HitError;

    expect(JSON.stringify({ message: error.message, body: error.body })).not.toContain(KEY);
  });

  it('throws a clear error when the terminal is not configured', async () => {
    vi.stubEnv('WINDCAVE_HIT_KEY', '');
    mockFetch(OK_BODY);

    await expect(pollStatus('VK-1')).rejects.toThrow(/WINDCAVE_HIT_KEY/);
  });

  it('refuses to send without a VendorId rather than falling back to a placeholder', async () => {
    // Windcave assigns this. A default would pass UAT and be rejected in
    // production — the worst possible moment to discover it.
    vi.stubEnv('WINDCAVE_HIT_VENDOR_ID', '');
    mockFetch(OK_BODY);

    await expect(
      startPurchase({ amount: '1.00', currency: 'NZD', txnRef: 'VK-1' }),
    ).rejects.toThrow(/WINDCAVE_HIT_VENDOR_ID/);
  });
});
