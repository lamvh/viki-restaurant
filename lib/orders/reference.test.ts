import { describe, expect, it } from 'vitest';

import { opaqueToken, orderReference } from './reference';

describe('orderReference', () => {
  it('is a VK- prefix plus six unambiguous characters', () => {
    // No I, L, O or U — the reference gets read aloud across a counter.
    expect(orderReference()).toMatch(/^VK-[0-9A-HJKMNP-TV-Z]{6}$/);
  });

  it('does not repeat across a thousand draws', () => {
    const seen = new Set(Array.from({ length: 1000 }, () => orderReference()));

    expect(seen.size).toBe(1000);
  });
});

describe('opaqueToken', () => {
  it('is URL-safe, so it can sit in a path segment unescaped', () => {
    expect(opaqueToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('is long enough not to be guessable', () => {
    expect(opaqueToken().length).toBeGreaterThanOrEqual(32);
  });

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 1000 }, () => opaqueToken()));

    expect(seen.size).toBe(1000);
  });
});
