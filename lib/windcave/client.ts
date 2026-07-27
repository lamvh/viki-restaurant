import 'server-only';

// Transport for the Windcave REST API (online channel).
//
// Envelope per https://www.windcave.com/developer-e-commerce-api-rest —
// note `POST /sessions` answers **202**, not 200.

import { windcaveEnv } from './env';
import type { CreateSessionInput, WindcaveSession } from './types';

const TIMEOUT_MS = 10_000;

export class WindcaveError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'WindcaveError';
  }
}

/** Money as Windcave expects it: a two-decimal string, never a JS number. */
export function formatAmount(value: number): string {
  return value.toFixed(2);
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const env = windcaveEnv();

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: env.authHeader,
        ...init.headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (cause) {
    // Transport failure — safe to retry, unlike a declined card. The request is
    // deliberately not attached: the header carries the API key.
    throw new WindcaveError(
      `Windcave request failed: ${(cause as Error)?.message ?? 'network error'}`,
    );
  }

  const text = await response.text();

  // Create answers 202, query answers 200 — accept any 2xx rather than
  // equality-checking a single code.
  if (!response.ok) {
    throw new WindcaveError('Windcave returned an error', response.status, text);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new WindcaveError('Windcave returned malformed JSON', response.status, text);
  }
}

export async function createSession(input: CreateSessionInput): Promise<WindcaveSession> {
  return request<WindcaveSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ type: 'purchase', methods: ['card'], ...input }),
  });
}

export async function querySession(sessionId: string): Promise<WindcaveSession> {
  return request<WindcaveSession>(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
  });
}

/**
 * The hosted-payment-page redirect target.
 *
 * Extracted from the `links` array rather than reconstructed — Windcave
 * explicitly recommends passing links through unmodified, and it is what keeps a
 * later switch to the Drop-In component a frontend-only change.
 */
export function hppUrl(session: WindcaveSession): string {
  const link = session.links?.find((l) => l.rel === 'hpp');
  if (!link?.href) throw new WindcaveError('Windcave session returned no hpp link');
  return link.href;
}
