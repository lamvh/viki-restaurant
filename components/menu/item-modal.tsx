'use client';

import { useState } from 'react';
import type { MenuItem, OptionGroup as OptionGroupType } from '@/types/menu';
import { useCartStore } from '@/store/cart-store';
import { findItem } from '@/data/menu';
import {
  buildCartLine,
  defaultSelections,
  lineUnit,
  type Selections,
} from '@/lib/build-cart-line';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { OptionGroup } from './option-group';
import { ImageSlot } from '@/components/ui/image-slot';
import { Money } from '@/components/ui/money';

/** Global item-modal mount. Renders nothing unless a menu item is open. */
export function ItemModal() {
  const modalItemId = useCartStore((s) => s.modalItemId);
  const item = modalItemId ? findItem(modalItemId) : undefined;
  // Key by id so the panel's local selection/qty/notes reset per item.
  return item ? <ItemModalPanel key={item.id} item={item} /> : null;
}

function ItemModalPanel({ item }: { item: MenuItem }) {
  const addLine = useCartStore((s) => s.addLine);
  const closeItem = useCartStore((s) => s.closeItem);
  const openCart = useCartStore((s) => s.openCart);

  const [selections, setSelections] = useState<Selections>(() =>
    defaultSelections(item),
  );
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const panelRef = useFocusTrap<HTMLDivElement>(closeItem);

  function toggle(group: OptionGroupType, choiceId: string) {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      if (group.type === 'single') return { ...prev, [group.id]: [choiceId] };
      const next = current.includes(choiceId)
        ? current.filter((id) => id !== choiceId)
        : [...current, choiceId];
      return { ...prev, [group.id]: next };
    });
  }

  function add() {
    addLine(buildCartLine(item, selections, qty, notes));
    closeItem();
    openCart();
  }

  const unit = lineUnit(item, selections);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div className="absolute inset-0 bg-ink/40" onClick={closeItem} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-card)] bg-surface outline-none sm:rounded-[var(--radius-card)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div>
            <h2 className="text-xl leading-tight">{item.name}</h2>
            <p className="mt-1 text-sm text-muted">{item.desc}</p>
          </div>
          <button
            type="button"
            onClick={closeItem}
            aria-label="Close"
            className="shrink-0 rounded-[var(--radius-btn)] px-2 py-1 text-muted hover:bg-surface-alt"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <ImageSlot label={item.name} ratio="16 / 9" className="mb-4 w-full" />

          {(item.groups ?? []).map((group) => (
            <OptionGroup
              key={group.id}
              group={group}
              selected={selections[group.id] ?? []}
              onToggle={(choiceId) => toggle(group, choiceId)}
            />
          ))}

          <div className="border-t border-line pt-4">
            <label htmlFor="item-notes" className="mb-2 block text-sm font-semibold">
              Special instructions
            </label>
            <textarea
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. no coriander, extra chilli"
              className="w-full resize-none rounded-[var(--radius-btn)] border border-line p-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-line p-4">
          <div className="flex items-center rounded-[var(--radius-pill)] border border-line">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="px-3 py-2 text-lg text-subtle disabled:opacity-40"
              disabled={qty <= 1}
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-medium" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase quantity"
              className="px-3 py-2 text-lg text-subtle"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={add}
            className="flex flex-1 items-center justify-between gap-3 rounded-[var(--radius-btn)] bg-brand px-4 py-3 text-sm font-semibold text-surface"
          >
            <span>Add to order</span>
            <Money value={unit * qty} />
          </button>
        </div>
      </div>
    </div>
  );
}
