import type { MenuCategory } from '@/types/menu';

// Dishes, prices and photos are Viki's real menu (source: restaurant's public
// ordering listing). Dietary tags are intentionally omitted until per-dish
// allergen info is confirmed by the kitchen.
export const charcoalSignature: MenuCategory = {
  id: 'signature',
  name: 'Charcoal Signature',
  items: [
    {
      id: 'porkbellyvermicelli',
      name: 'Grilled Pork Belly on Vermicelli',
      desc: 'Charcoal-grilled pork belly on vermicelli with house dipping sauce and pickled green papaya.',
      price: 28.9,
      image: '/dishes/bun-cha.jpg',
    },
    {
      id: 'firephoenix',
      name: 'Fire Phoenix',
      desc: "Chicken marinated in lemongrass, bird's-eye chilli and kaffir lime, slowly charcoal-grilled. Dinner only.",
      price: 27,
      image: '/dishes/charcoal-chicken.jpg',
    },
  ],
};
