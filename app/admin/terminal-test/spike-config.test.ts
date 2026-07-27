import { describe, expect, it } from 'vitest';

import { MAX_TEST_AMOUNT, parseTestAmount } from './spike-config';

describe('parseTestAmount', () => {
  it('accepts ordinary amounts', () => {
    expect(parseTestAmount('1.00')).toEqual({ ok: true, value: 1 });
    expect(parseTestAmount('12.50')).toEqual({ ok: true, value: 12.5 });
    expect(parseTestAmount(' 0.01 ')).toEqual({ ok: true, value: 0.01 });
  });

  it('rejects zero and negatives — a terminal must never be sent either', () => {
    expect(parseTestAmount('0')).toMatchObject({ ok: false });
    expect(parseTestAmount('-5')).toMatchObject({ ok: false });
  });

  it('rejects non-numeric input', () => {
    expect(parseTestAmount('abc')).toMatchObject({ ok: false });
    expect(parseTestAmount('')).toMatchObject({ ok: false });
    expect(parseTestAmount(undefined)).toMatchObject({ ok: false });
  });

  it('rejects sub-cent precision, which cannot be charged', () => {
    expect(parseTestAmount('1.005')).toMatchObject({ ok: false });
  });

  it('caps the amount so a typo cannot charge a large sum', () => {
    expect(parseTestAmount(String(MAX_TEST_AMOUNT))).toMatchObject({ ok: true });
    expect(parseTestAmount(String(MAX_TEST_AMOUNT + 1))).toMatchObject({ ok: false });
  });
});
