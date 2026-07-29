'use client';

import { createContext, useContext, useMemo } from 'react';

import type { MenuCategory, MenuItem } from '@/types/menu';

/**
 * Makes the menu available to client components (the item modal, category
 * chips) without them importing the static file.
 *
 * The server layout fetches it once per request, so an admin edit shows up on
 * the public site instead of only in the database.
 */
const MenuContext = createContext<MenuCategory[]>([]);

export function MenuProvider({
  menu,
  children,
}: {
  menu: MenuCategory[];
  children: React.ReactNode;
}) {
  return <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuCategory[] {
  return useContext(MenuContext);
}

export function useMenuItem(id: string | null): MenuItem | undefined {
  const menu = useMenu();
  return useMemo(
    () => (id ? menu.flatMap((c) => c.items).find((item) => item.id === id) : undefined),
    [menu, id],
  );
}
