import { describe, it, expect } from 'vitest';
import {
  lineUnit,
  lineLabels,
  lineKey,
  buildCartLine,
  defaultSelections,
} from '@/lib/build-cart-line';
import type { MenuItem } from '@/types/menu';

// Item with a single-choice group (>1 choice), a multi group, and one item
// with a degenerate single-choice group (1 choice) to exercise the label rule.
const item: MenuItem = {
  id: 'phobo',
  name: 'Phở Bò',
  desc: 'Beef noodle soup.',
  price: 16,
  groups: [
    {
      id: 'size',
      title: 'Size',
      type: 'single',
      choices: [
        { id: 'regular', label: 'Regular', price: 0 },
        { id: 'large', label: 'Large', price: 3 },
      ],
    },
    {
      id: 'addons',
      title: 'Add-ons',
      type: 'multi',
      choices: [
        { id: 'brisket', label: 'Extra brisket', price: 4 },
        { id: 'chilli', label: 'Chilli oil', price: 0 },
      ],
    },
  ],
};

const soloSingle: MenuItem = {
  id: 'solo',
  name: 'Solo',
  desc: '',
  price: 10,
  groups: [
    {
      id: 'only',
      title: 'Only',
      type: 'single',
      choices: [{ id: 'x', label: 'The only option', price: 2 }],
    },
  ],
};

describe('defaultSelections', () => {
  it('defaults single groups to first choice and multi groups to empty', () => {
    expect(defaultSelections(item)).toEqual({ size: ['regular'], addons: [] });
  });
});

describe('lineUnit', () => {
  it('is the base price with default selections', () => {
    expect(lineUnit(item, defaultSelections(item))).toBe(16);
  });

  it('adds single and multi option deltas', () => {
    expect(lineUnit(item, { size: ['large'], addons: ['brisket'] })).toBe(23);
  });
});

describe('lineLabels', () => {
  it('omits a single-choice selection when its group has only one choice', () => {
    expect(lineLabels(soloSingle, { only: ['x'] })).toEqual([]);
  });

  it('includes single-choice labels when the group offers more than one', () => {
    expect(lineLabels(item, { size: ['large'], addons: [] })).toEqual(['Large']);
  });

  it('includes all selected multi-choice labels (alongside the shown single label)', () => {
    // size has >1 choice so its 'Regular' label is shown too.
    expect(lineLabels(item, { size: ['regular'], addons: ['brisket', 'chilli'] })).toEqual([
      'Regular',
      'Extra brisket',
      'Chilli oil',
    ]);
  });
});

describe('lineKey', () => {
  it('is stable regardless of selection order', () => {
    const a = lineKey(item, { size: ['regular'], addons: ['brisket', 'chilli'] }, '');
    const b = lineKey(item, { size: ['regular'], addons: ['chilli', 'brisket'] }, '');
    expect(a).toBe(b);
  });

  it('differs when notes differ', () => {
    const a = lineKey(item, defaultSelections(item), 'no onion');
    const b = lineKey(item, defaultSelections(item), '');
    expect(a).not.toBe(b);
  });
});

describe('buildCartLine', () => {
  it('assembles a complete cart line', () => {
    const line = buildCartLine(item, { size: ['large'], addons: ['brisket'] }, 2, '  spicy ');
    expect(line).toMatchObject({
      id: 'phobo',
      name: 'Phở Bò',
      unit: 23,
      qty: 2,
      labels: ['Large', 'Extra brisket'],
      notes: 'spicy',
    });
    expect(line.key).toContain('phobo|');
  });
});
