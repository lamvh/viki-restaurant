'use client';

import { useMemo, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import type { AdminMenuCategory } from '@/lib/db/list-menu-admin';

import { MenuCategoryTabs } from './menu-category-tabs';
import { MenuItemCard } from './menu-item-card';
import { MenuItemDialog, type MenuDialogTarget } from './menu-item-dialog';

const ALL = 'all';

/**
 * Menu manager: category tabs over a flat dish grid, with a modal editor.
 *
 * Client-side because the tab filter and the dialog are pure interaction — the
 * whole menu is already on the page, so filtering it through the server would
 * add a round trip for nothing.
 */
export function MenuScreen({
  categories,
  canDelete,
}: {
  categories: AdminMenuCategory[];
  canDelete: boolean;
}) {
  const [activeId, setActiveId] = useState(ALL);
  const [dialog, setDialog] = useState<MenuDialogTarget | null>(null);

  const allItems = useMemo(() => categories.flatMap((c) => c.items), [categories]);
  const items = activeId === ALL ? allItems : (categories.find((c) => c.id === activeId)?.items ?? []);

  const tabs = [
    { id: ALL, name: 'All', count: allItems.length },
    ...categories.map((c) => ({ id: c.id, name: c.name, count: c.items.length })),
  ];

  // "+ New dish" needs somewhere to put it: the open tab, or the first category
  // when viewing All.
  const newDishCategoryId = activeId === ALL ? categories[0]?.id : activeId;

  return (
    <div className="mx-auto max-w-[1180px]">
      <AdminPageHeader
        title="Menu & products"
        sub="Prices, availability and dishes"
        action={
          newDishCategoryId ? (
            <button
              type="button"
              onClick={() => setDialog({ item: null, categoryId: newDishCategoryId })}
              className="rounded-[10px] bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white"
            >
              + New dish
            </button>
          ) : undefined
        }
      />

      <MenuCategoryTabs tabs={tabs} activeId={activeId} onSelect={setActiveId} />

      {items.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-admin-line-strong bg-admin-card px-6 py-12 text-center text-sm text-admin-faint">
          {categories.length === 0
            ? 'No categories yet. Run `npm run db:seed` to import the starting menu.'
            : 'No dishes in this category yet.'}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {items.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onEdit={() => setDialog({ item, categoryId: item.categoryId })}
            />
          ))}
        </div>
      )}

      {dialog ? (
        <MenuItemDialog
          // Remounts per target, so the form always opens with that dish's values
          // rather than whatever was last typed.
          key={dialog.item?.id ?? 'new'}
          target={dialog}
          categories={categories}
          canDelete={canDelete}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
