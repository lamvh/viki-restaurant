import { describe, expect, it, vi } from 'vitest';

import type { MenuItem } from '@/types/menu';

// The live menu currently has no option groups, so the group rules — the part
// that actually guards pricing — would go untested against real data. A fake
// menu exercises them properly.
const PHO: MenuItem = { id: 'phobo', name: 'Pho Bo', desc: '', price: 22.5 };

const BOWL: MenuItem = {
  id: 'bowl',
  name: 'Custom Bowl',
  desc: '',
  price: 10,
  groups: [
    {
      id: 'size',
      title: 'Size',
      type: 'single',
      choices: [
        { id: 'regular', label: 'Regular', price: 0 },
        { id: 'large', label: 'Large', price: 4 },
      ],
    },
    {
      id: 'extras',
      title: 'Extras',
      type: 'multi',
      choices: [
        { id: 'egg', label: 'Egg', price: 2 },
        { id: 'beef', label: 'Extra beef', price: 5 },
      ],
    },
  ],
};

vi.mock('@/data/menu', () => ({
  findItem: (id: string) => [PHO, BOWL].find((item) => item.id === id),
}));

const { rebuildCart } = await import('./rebuild-cart');

function line(over: Partial<{ itemId: string; choiceIds: string[]; qty: number; notes: string }> = {}) {
  return { itemId: 'phobo', choiceIds: [], qty: 1, notes: '', ...over };
}

describe('pricing is taken from the menu, never the client', () => {
  it('prices a plain line from the menu', () => {
    const result = rebuildCart([line()]);

    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.lines[0].unit).toBe(22.5);
  });

  it('ignores any price the client might have implied', () => {
    // The wire type carries no price at all — this pins that guarantee, since
    // adding one later would silently reopen the hole.
    const forged = { ...line(), unit: 0.01, price: 0.01, total: 0.01 };
    const result = rebuildCart([forged]);

    if (!result.ok) throw new Error(result.error);
    expect(result.lines[0].unit).toBe(22.5);
  });

  it('adds option prices from the menu, not the payload', () => {
    const result = rebuildCart([
      line({ itemId: 'bowl', choiceIds: ['large', 'egg'] }),
    ]);

    if (!result.ok) throw new Error(result.error);
    // 10 base + 4 large + 2 egg
    expect(result.lines[0].unit).toBe(16);
  });
});

describe('rejections', () => {
  it('rejects an empty cart', () => {
    expect(rebuildCart([])).toMatchObject({ ok: false });
  });

  it('rejects an unknown item id', () => {
    expect(rebuildCart([line({ itemId: 'not-a-dish' })])).toMatchObject({ ok: false });
  });

  it('rejects a choice id that belongs to no group on the item', () => {
    // Silently dropping it would change the price without telling anyone.
    expect(rebuildCart([line({ itemId: 'bowl', choiceIds: ['gold-plated'] })])).toMatchObject({
      ok: false,
    });
  });

  it('rejects two choices in a single-select group', () => {
    expect(
      rebuildCart([line({ itemId: 'bowl', choiceIds: ['regular', 'large'] })]),
    ).toMatchObject({ ok: false });
  });

  it('allows two choices in a multi-select group', () => {
    const result = rebuildCart([line({ itemId: 'bowl', choiceIds: ['egg', 'beef'] })]);

    if (!result.ok) throw new Error(result.error);
    expect(result.lines[0].unit).toBe(17);
  });

  it('rejects non-positive, fractional and oversized quantities', () => {
    expect(rebuildCart([line({ qty: 0 })])).toMatchObject({ ok: false });
    expect(rebuildCart([line({ qty: -1 })])).toMatchObject({ ok: false });
    expect(rebuildCart([line({ qty: 1.5 })])).toMatchObject({ ok: false });
    expect(rebuildCart([line({ qty: 51 })])).toMatchObject({ ok: false });
  });
});

describe('notes', () => {
  it('caps note length so a payload cannot flood the kitchen ticket', () => {
    const result = rebuildCart([line({ notes: 'x'.repeat(5000) })]);

    if (!result.ok) throw new Error(result.error);
    expect(result.lines[0].notes.length).toBe(500);
  });
});
