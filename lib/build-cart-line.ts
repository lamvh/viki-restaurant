// Pure helpers translating an item + its selected options into a CartLine.
// Kept out of the modal component so the label/price/key rules are unit-testable.

import type { MenuItem, OptionGroup } from '@/types/menu';
import type { CartLine } from '@/types/cart';

/** groupId → selected choice ids. */
export type Selections = Record<string, string[]>;

type Chosen = { choiceId: string; label: string; price: number; group: OptionGroup };

function chosenChoices(item: MenuItem, selections: Selections): Chosen[] {
  const out: Chosen[] = [];
  for (const group of item.groups ?? []) {
    const picked = selections[group.id] ?? [];
    for (const choice of group.choices) {
      if (picked.includes(choice.id)) {
        out.push({ choiceId: choice.id, label: choice.label, price: choice.price, group });
      }
    }
  }
  return out;
}

/** Per-unit price = base + all selected option deltas. */
export function lineUnit(item: MenuItem, selections: Selections): number {
  return chosenChoices(item, selections).reduce((sum, c) => sum + c.price, item.price);
}

/**
 * Display labels: multi-choice selections always shown; single-choice selections
 * shown only when the group offers more than one choice (design spec §5).
 */
export function lineLabels(item: MenuItem, selections: Selections): string[] {
  return chosenChoices(item, selections)
    .filter((c) => !(c.group.type === 'single' && c.group.choices.length <= 1))
    .map((c) => c.label);
}

/** Stable identity so identical customisations merge and different notes don't. */
export function lineKey(item: MenuItem, selections: Selections, notes: string): string {
  const ids = chosenChoices(item, selections)
    .map((c) => c.choiceId)
    .sort();
  return `${item.id}|${ids.join(',')}|${notes.trim()}`;
}

export function buildCartLine(
  item: MenuItem,
  selections: Selections,
  qty: number,
  notes: string,
): CartLine {
  return {
    key: lineKey(item, selections, notes),
    id: item.id,
    name: item.name,
    unit: lineUnit(item, selections),
    qty,
    labels: lineLabels(item, selections),
    notes: notes.trim(),
    // Carried so the server can reprice this line from the menu. `labels` are
    // display text and `key` embeds free-text notes, so neither round-trips.
    choiceIds: chosenChoices(item, selections)
      .map((c) => c.choiceId)
      .sort(),
  };
}

/** Single-choice groups default to their first option; multi groups start empty. */
export function defaultSelections(item: MenuItem): Selections {
  const sel: Selections = {};
  for (const group of item.groups ?? []) {
    sel[group.id] =
      group.type === 'single' && group.choices.length > 0 ? [group.choices[0].id] : [];
  }
  return sel;
}
