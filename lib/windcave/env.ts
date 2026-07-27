import 'server-only';

/**
 * Windcave REST configuration — the online (card-not-present) channel.
 *
 * Separate from `hit-env.ts`: the two channels use **different credentials**
 * (`VinapageUAT_API` vs `VinapageUAT_HIT`), and mixing them is the most likely
 * early mistake. See docs/windcave-integration.md.
 */
export type WindcaveEnv = {
  apiUrl: string;
  username: string;
  currency: string;
  notificationBaseUrl: string;
  /** Pre-built `Basic base64(username:apiKey)` header value. */
  authHeader: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Online payment is not configured — see docs/windcave-integration.md.`,
    );
  }
  return value;
}

/**
 * Read at request time, never at module load, so a missing key fails one payment
 * with a clear message rather than breaking the whole build.
 */
export function windcaveEnv(): WindcaveEnv {
  const username = required('WINDCAVE_USERNAME');
  const apiKey = required('WINDCAVE_API_KEY');

  return Object.freeze({
    apiUrl: (process.env.WINDCAVE_API_URL ?? 'https://uat.windcave.com/api/v1').replace(/\/$/, ''),
    username,
    currency: process.env.WINDCAVE_CURRENCY ?? 'NZD',
    // Absolute and config-derived. Never built from request headers — a Host
    // header is attacker-controlled and would divert payment callbacks.
    notificationBaseUrl: required('WINDCAVE_NOTIFICATION_BASE_URL').replace(/\/$/, ''),
    authHeader: `Basic ${Buffer.from(`${username}:${apiKey}`).toString('base64')}`,
  });
}

/** True when the online channel is configured — lets checkout hide the card option. */
export function isOnlinePaymentConfigured(): boolean {
  return Boolean(
    process.env.WINDCAVE_USERNAME &&
      process.env.WINDCAVE_API_KEY &&
      process.env.WINDCAVE_NOTIFICATION_BASE_URL,
  );
}
