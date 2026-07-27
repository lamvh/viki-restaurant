import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WindcaveError, createSession, formatAmount, hppUrl, querySession } from './client';

const KEY = 'super-secret-rest-key';

const CREATED = JSON.stringify({
  id: 'sess-1',
  state: 'init',
  links: [
    { href: 'https://uat.windcave.com/api/v1/sessions/sess-1', rel: 'self', method: 'GET' },
    { href: 'https://uat.windcave.com/pxmi3/HPPTOKEN', rel: 'hpp', method: 'REDIRECT' },
    { href: 'https://uat.windcave.com/pxmi3/SUBMIT', rel: 'submitCard', method: 'FORM_POST' },
  ],
});

function mockFetch(body: string, init: { ok?: boolean; status?: number } = {}) {
  const fn = vi.fn(async (_url: string, _init: RequestInit) => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => body,
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const INPUT = {
  amount: '12.50',
  currency: 'NZD',
  merchantReference: 'VK-7KQ2X9',
  callbackUrls: { approved: 'https://x/a', declined: 'https://x/d', cancelled: 'https://x/c' },
  notificationUrl: 'https://x/api/windcave/fprn?t=tok',
};

beforeEach(() => {
  vi.stubEnv('WINDCAVE_API_URL', 'https://uat.windcave.com/api/v1');
  vi.stubEnv('WINDCAVE_USERNAME', 'VinapageUAT_API');
  vi.stubEnv('WINDCAVE_API_KEY', KEY);
  vi.stubEnv('WINDCAVE_NOTIFICATION_BASE_URL', 'https://viki.example');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('createSession', () => {
  it('authenticates with Basic base64(username:apiKey)', async () => {
    const fetchMock = mockFetch(CREATED, { status: 202 });

    await createSession(INPUT);

    const headers = (fetchMock.mock.calls[0][1].headers ?? {}) as Record<string, string>;
    const expected = `Basic ${Buffer.from(`VinapageUAT_API:${KEY}`).toString('base64')}`;
    expect(headers.Authorization).toBe(expected);
  });

  it('accepts 202, which is what create actually returns', async () => {
    // Equality-checking 200 is a classic integration bug against this API.
    mockFetch(CREATED, { status: 202 });

    expect((await createSession(INPUT)).id).toBe('sess-1');
  });

  it('sends the amount as a string and defaults type/methods', async () => {
    const fetchMock = mockFetch(CREATED, { status: 202 });

    await createSession(INPUT);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.amount).toBe('12.50');
    expect(typeof body.amount).toBe('string');
    expect(body.type).toBe('purchase');
    expect(body.merchantReference).toBe('VK-7KQ2X9');
  });
});

describe('querySession', () => {
  it('url-encodes the session id', async () => {
    const fetchMock = mockFetch(JSON.stringify({ id: 'a/b' }));

    await querySession('a/b');

    expect(fetchMock.mock.calls[0][0]).toContain('/sessions/a%2Fb');
  });
});

describe('hppUrl', () => {
  it('picks rel="hpp" out of the links array', async () => {
    const session = await (async () => {
      mockFetch(CREATED, { status: 202 });
      return createSession(INPUT);
    })();

    expect(hppUrl(session)).toBe('https://uat.windcave.com/pxmi3/HPPTOKEN');
  });

  it('throws rather than guessing when no hpp link is present', () => {
    expect(() => hppUrl({ id: 'x', links: [{ href: 'h', rel: 'self', method: 'GET' }] })).toThrow(
      /no hpp link/,
    );
  });
});

describe('errors', () => {
  it('raises WindcaveError with the status on a non-2xx', async () => {
    mockFetch('unauthorised', { ok: false, status: 401 });

    await expect(querySession('sess-1')).rejects.toMatchObject({
      name: 'WindcaveError',
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

    await expect(querySession('sess-1')).rejects.toThrow(/Windcave request failed/);
  });

  it('raises on malformed JSON rather than returning undefined', async () => {
    mockFetch('<html>gateway down</html>');

    await expect(querySession('sess-1')).rejects.toThrow(/malformed JSON/);
  });

  it('never leaks the API key in an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );

    const error = (await querySession('s').catch((e: unknown) => e)) as WindcaveError;

    expect(JSON.stringify({ m: error.message, b: error.body })).not.toContain(KEY);
  });

  it('fails fast with a named variable when unconfigured', async () => {
    vi.stubEnv('WINDCAVE_API_KEY', '');
    mockFetch(CREATED);

    await expect(querySession('s')).rejects.toThrow(/WINDCAVE_API_KEY/);
  });
});

describe('formatAmount', () => {
  it('always produces two decimals', () => {
    expect(formatAmount(12.5)).toBe('12.50');
    expect(formatAmount(12)).toBe('12.00');
    expect(formatAmount(0.05)).toBe('0.05');
  });
});
