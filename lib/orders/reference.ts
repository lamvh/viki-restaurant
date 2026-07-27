import { randomBytes } from 'node:crypto';

// Crockford-style alphabet: no I, L, O, U — unambiguous when read aloud over a
// counter or a phone.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function token(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Human-quotable order reference, e.g. "VK-7KQ2X9". A unique index guards collisions. */
export function orderReference(): string {
  return `VK-${token(6)}`;
}

/**
 * Opaque URL-safe token. Used separately for the customer-facing confirmation
 * URL and for the payment-notification URL — those two must never share a secret.
 */
export function opaqueToken(): string {
  return randomBytes(24).toString('base64url');
}
