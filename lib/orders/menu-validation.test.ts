import { describe, expect, it } from 'vitest';

import { parseMenuPrice, toSlug } from './menu-validation';

describe('parseMenuPrice', () => {
  it('accepts ordinary prices', () => {
    expect(parseMenuPrice('22.50')).toEqual({ ok: true, value: 22.5 });
    expect(parseMenuPrice(' 0 ')).toEqual({ ok: true, value: 0 });
  });

  it('rejects negatives and non-numbers', () => {
    expect(parseMenuPrice('-1')).toMatchObject({ ok: false });
    expect(parseMenuPrice('free')).toMatchObject({ ok: false });
    expect(parseMenuPrice('')).toMatchObject({ ok: false });
  });

  it('rejects sub-cent precision, which cannot be charged', () => {
    // A price the terminal cannot charge would trip the amount-mismatch guard.
    expect(parseMenuPrice('12.505')).toMatchObject({ ok: false });
  });

  it('caps the price so a typo cannot list a dish at $99,999', () => {
    expect(parseMenuPrice('1000')).toMatchObject({ ok: true });
    expect(parseMenuPrice('1001')).toMatchObject({ ok: false });
  });
});

describe('toSlug', () => {
  it('strips Vietnamese diacritics so ids stay URL-safe', () => {
    expect(toSlug('Phở Bò')).toBe('phobo');
    expect(toSlug('Bún Chả Hà Nội')).toBe('bunchahanoi');
  });

  it('handles đ, which NFD does not decompose', () => {
    expect(toSlug('Đậu hũ')).toBe('dauhu');
  });

  it('drops punctuation and spaces', () => {
    expect(toSlug('Combo #1 — Special!')).toBe('combo1special');
  });

  it('bounds the length', () => {
    expect(toSlug('a'.repeat(100)).length).toBe(40);
  });
});
