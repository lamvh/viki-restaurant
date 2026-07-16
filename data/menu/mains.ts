import type { MenuCategory } from '@/types/menu';

// Dishes, prices and photos are Viki's real menu (source: restaurant's public
// ordering listing). Dietary tags are intentionally omitted until per-dish
// allergen info is confirmed by the kitchen.
export const mains: MenuCategory = {
  id: 'mains',
  name: 'Mains',
  items: [
    {
      id: 'phobo',
      name: 'Beef Phở',
      desc: 'Slow-cooked Northern-style beef broth with herbs, spices, bean sprouts, onion and sliced flank steak.',
      price: 22.5,
      image: '/dishes/pho-bo.jpg',
    },
    {
      id: 'phoga',
      name: 'Chicken Phở',
      desc: 'Hanoi-style broth with sliced chicken leg fillet, onion, herbs and kaffir lime leaf.',
      price: 21.9,
      image: '/dishes/pho-ga.jpg',
    },
    {
      id: 'beefnoodle',
      name: 'Stir-Fried Noodles with Beef',
      desc: 'Rice noodles wok-tossed with beef flank and Shanghai bok choy in a house sauce.',
      price: 24.9,
      image: '/dishes/beef-noodle.jpg',
    },
    {
      id: 'beefsteak',
      name: 'Vietnamese Street Food Beef Steak',
      desc: 'Grilled New Zealand scotch fillet with egg, potatoes, tomato, cucumber and house pâté.',
      price: 34.9,
      image: '/dishes/beef-steak.jpg',
    },
  ],
};
