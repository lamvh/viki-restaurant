'use client';

import { useState, useTransition } from 'react';

import { setItemFlag } from '@/app/admin/menu/actions';
import { ImageSlot } from '@/components/ui/image-slot';
import { money } from '@/lib/format';
import type { AdminMenuItem } from '@/lib/db/list-menu-admin';

import { AvailabilitySwitch } from './availability-switch';

/** One dish in the grid: thumbnail, price, availability toggle, edit. */
export function MenuItemCard({
  item,
  onEdit,
}: {
  item: AdminMenuItem;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Mirrored locally so the switch moves on tap rather than after the round
  // trip; the server revalidation is what makes it stick.
  const [available, setAvailable] = useState(item.isAvailable);

  function toggle(next: boolean) {
    setAvailable(next);
    setError(null);
    startTransition(async () => {
      const result = await setItemFlag(item.id, 'is_available', next);
      if (!result.ok) {
        setAvailable(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-[14px] border border-admin-line bg-admin-card p-3.5 transition-opacity ${
        available ? '' : 'opacity-60'
      }`}
    >
      <ImageSlot
        label={item.name}
        src={item.imageUrl ?? undefined}
        shape="rect"
        className="h-14 w-14 shrink-0 overflow-hidden rounded-[11px]"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[14.5px] font-bold">{item.name}</span>
          <span className="ml-auto shrink-0 font-display text-[19px] text-brand">
            {money(item.price)}
          </span>
        </div>

        <p className="mt-px text-[11.5px] text-admin-faint">
          {item.categoryName}
          {item.soldToday > 0 ? ` · ${item.soldToday} sold today` : ''}
          {item.tags.length > 0 ? ` · ${item.tags.join(' ')}` : ''}
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          <AvailabilitySwitch
            checked={available}
            onChange={toggle}
            disabled={pending}
            label={`${item.name} availability`}
          />
          <button
            type="button"
            onClick={onEdit}
            className="ml-auto rounded-[9px] border border-admin-line-strong bg-white px-3.5 py-[7px] text-[12.5px] font-bold"
          >
            Edit
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-1.5 text-[11.5px] font-semibold text-admin-red">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
