import { describe, expect, it } from 'vitest';

import { isDinnerOnly } from './dinner-only';

describe('isDinnerOnly', () => {
  it('matches the marker the kitchen writes into a description', () => {
    expect(
      isDinnerOnly({
        desc: "Chicken marinated in lemongrass, bird's-eye chilli and kaffir lime. Dinner only.",
      }),
    ).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isDinnerOnly({ desc: 'DINNER ONLY' })).toBe(true);
  });

  it('is false for an ordinary description', () => {
    expect(isDinnerOnly({ desc: 'Overnight bone broth, brisket, flank, six spices.' })).toBe(false);
  });

  it('does not match the word dinner on its own', () => {
    expect(isDinnerOnly({ desc: 'A generous dinner portion for two.' })).toBe(false);
  });
});
