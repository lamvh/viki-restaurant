// Menu domain types. Mirrors the source design's MENU shape (design spec §5).

export type Tag = 'GF' | 'DF' | 'VEG' | 'R18';

export type OptionChoice = {
  id: string;
  label: string;
  /** Price delta added to the item's base price when selected. */
  price: number;
};

export type OptionGroup = {
  id: string;
  title: string;
  /** 'single' = pick one (radio); 'multi' = pick any (checkbox). */
  type: 'single' | 'multi';
  choices: OptionChoice[];
};

export type MenuItem = {
  id: string;
  name: string;
  desc: string;
  /** Base price in NZD. */
  price: number;
  tags?: Tag[];
  groups?: OptionGroup[];
  /** Dish photo under /public. Omitted → ImageSlot renders its placeholder. */
  image?: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  items: MenuItem[];
};
