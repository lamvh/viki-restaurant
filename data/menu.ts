// Menu aggregator. Categories live in ./menu/* (one file each, < 200 lines);
// this module composes them and exposes lookup + featured helpers.

import type { MenuCategory, MenuItem } from '@/types/menu';
import { appetizers } from './menu/appetizers';
import { mains } from './menu/mains';
import { charcoalSignature } from './menu/charcoal-signature';

export const MENU: MenuCategory[] = [appetizers, mains, charcoalSignature];

/** Flattened list of every item across all categories. */
export const ALL_ITEMS: MenuItem[] = MENU.flatMap((category) => category.items);

/** "Popular right now" item ids — all photographed, visually strong. */
export const FEATURED_IDS = ['phobo', 'porkbellyvermicelli', 'firephoenix'] as const;

export function findItem(id: string): MenuItem | undefined {
  return ALL_ITEMS.find((item) => item.id === id);
}

/** Featured items in the declared order, skipping any unknown id. */
export function featuredItems(): MenuItem[] {
  return FEATURED_IDS.map((id) => findItem(id)).filter(
    (item): item is MenuItem => item !== undefined,
  );
}
