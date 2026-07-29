'use client';

import { useState, useTransition } from 'react';

import { createMenuItem, deleteMenuItem, setItemFlag, updateMenuItem } from '@/app/admin/menu/actions';
import { MENU_TAGS } from '@/lib/orders/menu-validation';
import { useFocusTrap } from '@/lib/use-focus-trap';
import type { AdminMenuCategory, AdminMenuItem } from '@/lib/db/list-menu-admin';

/** `null` item = create mode; the dialog then needs a category to insert into. */
export type MenuDialogTarget = { item: AdminMenuItem | null; categoryId: string };

export function MenuItemDialog({
  target,
  categories,
  canDelete,
  onClose,
}: {
  target: MenuDialogTarget;
  categories: AdminMenuCategory[];
  canDelete: boolean;
  onClose: () => void;
}) {
  const { item } = target;
  const isNew = item === null;

  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item ? item.price.toFixed(2) : '');
  const [categoryId, setCategoryId] = useState(target.categoryId);
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [available, setAvailable] = useState(item?.isAvailable ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const panelRef = useFocusTrap<HTMLDivElement>(onClose);

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      if (isNew) {
        const result = await createMenuItem(categoryId, {
          name,
          price,
          description,
          tags,
          isAvailable: available,
        });
        if (result.ok) onClose();
        else setError(result.error);
        return;
      }

      const result = await updateMenuItem(item.id, {
        name,
        description,
        price,
        categoryId,
        tags,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (available !== item.isAvailable) {
        const flagged = await setItemFlag(item.id, 'is_available', available);
        if (!flagged.ok) {
          setError(flagged.error);
          return;
        }
      }

      onClose();
    });
  }

  function remove() {
    if (!item) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteMenuItem(item.id);
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'New dish' : `Edit ${item.name}`}
      className="fixed inset-0 z-90 flex items-end justify-center bg-[rgb(23_19_15/0.5)] p-0 min-[820px]:items-center min-[820px]:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-t-[20px] bg-admin-bg outline-none min-[820px]:rounded-[18px]"
      >
        <div className="flex items-center justify-between border-b border-admin-line px-[22px] py-[18px]">
          <h2 className="font-display text-2xl">{isNew ? 'New dish' : 'Edit dish'}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-[34px] w-[34px] rounded-full bg-admin-well text-base text-admin-muted"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3.5 p-[22px]">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Dish name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={LABEL}>Price ($)</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                className={FIELD}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={LABEL}>Category</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={FIELD}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${FIELD} resize-y`}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className={LABEL}>Dietary tags</span>
            <div className="flex flex-wrap gap-2">
              {MENU_TAGS.map((tag) => {
                const on = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-pressed={on}
                    className={`rounded-[9px] border px-3.5 py-2 text-[12.5px] font-bold transition-colors ${
                      on
                        ? 'border-brand bg-brand text-white'
                        : 'border-admin-line-strong bg-white text-admin-muted'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={available}
            onClick={() => setAvailable((current) => !current)}
            className="flex items-center gap-2.5 py-1"
          >
            <span
              className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
                available ? 'bg-brand' : 'bg-admin-faint/60'
              }`}
            >
              <span
                className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-[left] ${
                  available ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </span>
            <span className="text-sm font-semibold">
              {available ? 'Available on the menu' : 'Hidden from the menu'}
            </span>
          </button>

          {error ? (
            <p role="alert" className="text-[13px] font-semibold text-admin-red">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5 px-[22px] pb-[22px]">
          {canDelete && !isNew ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded-[11px] border border-admin-red/40 bg-white px-4 py-3.5 text-[13.5px] font-bold text-admin-red disabled:opacity-50"
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex-1 rounded-[11px] bg-brand px-4 py-3.5 text-[14.5px] font-bold text-white disabled:opacity-50"
          >
            {pending ? 'Saving…' : isNew ? 'Add dish' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const LABEL = 'text-[11px] font-bold uppercase tracking-[0.5px] text-admin-faint';
const FIELD =
  'w-full rounded-[10px] border border-admin-line-strong bg-white px-3 py-3 text-[15px] outline-none focus:border-brand';
