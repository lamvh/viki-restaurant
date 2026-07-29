import { describe, expect, it } from 'vitest';

import { gstIncludedIn, GST_RATE } from './pricing-gst';

describe('gstIncludedIn', () => {
  it('extracts the inclusive component, not an added-on tax', () => {
    // $115 inclusive is $100 + $15 GST — never $17.25.
    expect(gstIncludedIn(115)).toBe(15);
  });

  it('rounds to whole cents', () => {
    expect(gstIncludedIn(32)).toBe(4.17);
    expect(gstIncludedIn(63)).toBe(8.22);
  });

  it('leaves the net amount recoverable', () => {
    const total = 47.5;
    expect(total - gstIncludedIn(total)).toBeCloseTo(total / (1 + GST_RATE), 2);
  });

  it('is zero for an empty or invalid total', () => {
    expect(gstIncludedIn(0)).toBe(0);
    expect(gstIncludedIn(-10)).toBe(0);
    expect(gstIncludedIn(Number.NaN)).toBe(0);
  });
});
