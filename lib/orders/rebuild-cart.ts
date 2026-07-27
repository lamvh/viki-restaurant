import { findItem } from '@/data/menu';
import { buildCartLine, type Selections } from '@/lib/build-cart-line';
import type { CartLine, CheckoutLineInput } from '@/types/cart';

export type RebuildResult = { ok: true; lines: CartLine[] } | { ok: false; error: string };

/** Bounds the note text that reaches a kitchen ticket and the database. */
const MAX_NOTE_LENGTH = 500;
/** A sane per-line ceiling. Not a business rule — a guard against a bad payload. */
const MAX_QTY = 50;

/**
 * Rebuilds trusted cart lines from untrusted wire input.
 *
 * **This is the security boundary of the whole payment flow.** Prices come only
 * from the menu, never from the client, so whatever the browser claims a line
 * costs is irrelevant to what gets charged. Any unknown id or malformed
 * selection is a hard rejection rather than a silently dropped option — a
 * silently dropped option would change the price without telling anyone.
 */
export function rebuildCart(input: CheckoutLineInput[]): RebuildResult {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: 'Your cart is empty.' };
  }

  const lines: CartLine[] = [];

  for (const raw of input) {
    const item = findItem(String(raw?.itemId ?? ''));
    if (!item) return { ok: false, error: `Unknown menu item: ${raw?.itemId}` };

    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return { ok: false, error: `Invalid quantity for ${item.name}.` };
    }

    const choiceIds = Array.isArray(raw.choiceIds) ? raw.choiceIds.map(String) : [];
    const selections: Selections = {};
    const known = new Set<string>();

    for (const group of item.groups ?? []) {
      const picked = group.choices
        .filter((choice) => choiceIds.includes(choice.id))
        .map((choice) => choice.id);

      if (group.type === 'single' && picked.length > 1) {
        return { ok: false, error: `Only one ${group.title} may be selected.` };
      }

      selections[group.id] = picked;
      for (const choice of group.choices) known.add(choice.id);
    }

    // A choice id that belongs to no group on this item means the payload was
    // built against a different item, or hand-edited.
    const unknown = choiceIds.find((id) => !known.has(id));
    if (unknown) return { ok: false, error: `Unknown option: ${unknown}` };

    lines.push(
      buildCartLine(item, selections, qty, String(raw.notes ?? '').slice(0, MAX_NOTE_LENGTH)),
    );
  }

  return { ok: true, lines };
}
