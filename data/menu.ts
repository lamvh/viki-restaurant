// Menu aggregator. Categories live in ./menu/* (one file each, < 200 lines);
// this module composes them and exposes lookup + featured helpers.

import type { MenuCategory, MenuItem } from '@/types/menu';
import { streetFood } from './menu/street-food';
import { salads } from './menu/salads';
import { phoAndSoups } from './menu/pho-and-soups';
import { riceAndNoodleMains } from './menu/rice-and-noodle-mains';
import { banhMi } from './menu/banh-mi';
import { drinksAndDessert } from './menu/drinks-and-dessert';

export const MENU: MenuCategory[] = [
  streetFood,
  salads,
  phoAndSoups,
  riceAndNoodleMains,
  banhMi,
  drinksAndDessert,
];

/** Flattened list of every item across all categories. */
export const ALL_ITEMS: MenuItem[] = MENU.flatMap((category) => category.items);

/** "Popular right now" item ids (design spec §5). */
export const FEATURED_IDS = ['phobo', 'lcsalad', 'porkbm'] as const;

export function findItem(id: string): MenuItem | undefined {
  return ALL_ITEMS.find((item) => item.id === id);
}

/** Featured items in the declared order, skipping any unknown id. */
export function featuredItems(): MenuItem[] {
  return FEATURED_IDS.map((id) => findItem(id)).filter(
    (item): item is MenuItem => item !== undefined,
  );
}
