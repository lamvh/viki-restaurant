import type { MenuCategory } from '@/types/menu';

// Dishes, prices and photos are Viki's real menu (source: restaurant's public
// ordering listing). Dietary tags are intentionally omitted until per-dish
// allergen info is confirmed by the kitchen.
export const appetizers: MenuCategory = {
  id: 'appetizers',
  name: 'Appetizers',
  items: [
    {
      id: 'nem',
      name: 'Hanoi Crispy Spring Rolls (Nem)',
      desc: 'Northern-style rolls of pork, egg, glass noodle, carrot and wood-ear mushroom, with house dipping sauce.',
      price: 16.5,
      image: '/dishes/springroll.jpg',
    },
    {
      id: 'porksummerrolls',
      name: 'Grilled Pork Summer Rolls',
      desc: 'Charcoal-grilled pork belly rolled with cucumber, iceberg, pineapple, herbs and vermicelli, house dipping sauce.',
      price: 16.9,
      image: '/dishes/summer-rolls.jpg',
    },
  ],
};
