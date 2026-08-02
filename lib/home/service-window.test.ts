import { describe, expect, it } from 'vitest';

import { formatHour, isDinnerService } from './service-window';

describe('isDinnerService', () => {
  it('is false before the switch-over hour', () => {
    expect(isDinnerService(16, 17)).toBe(false);
  });

  it('is true on the hour itself', () => {
    expect(isDinnerService(17, 17)).toBe(true);
  });

  it('stays true for the rest of the evening', () => {
    expect(isDinnerService(19, 17)).toBe(true);
  });
});

describe('formatHour', () => {
  it('formats morning hours', () => {
    expect(formatHour(11)).toBe('11am');
  });

  it('treats noon as pm without wrapping to zero', () => {
    expect(formatHour(12)).toBe('12pm');
  });

  it('formats afternoon hours on a 12-hour clock', () => {
    expect(formatHour(17)).toBe('5pm');
  });
});
