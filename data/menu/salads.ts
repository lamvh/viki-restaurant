import type { MenuCategory } from '@/types/menu';

export const salads: MenuCategory = {
  id: 'salads',
  name: 'Salads',
  items: [
    {
      id: 'lcsalad',
      name: 'Lemongrass Chicken Salad',
      desc: 'Shredded cabbage, herbs, fried shallots, nước chấm dressing.',
      price: 17,
      tags: ['GF', 'DF'],
      image: '/dishes/chicken-salad.jpg',
      groups: [
        {
          id: 'lcsalad-protein',
          title: 'Protein',
          type: 'single',
          choices: [
            { id: 'chicken', label: 'Lemongrass chicken', price: 0 },
            { id: 'prawn', label: 'Grilled prawn', price: 3 },
            { id: 'tofu', label: 'Tofu (vegan)', price: 0 },
          ],
        },
      ],
    },
    {
      id: 'greenpapaya',
      name: 'Gỏi Đu Đủ',
      desc: 'Green papaya, prawn, peanuts, chilli-lime dressing.',
      price: 16,
      tags: ['GF', 'DF'],
    },
    {
      id: 'beefsalad',
      name: 'Bò Tái Chanh',
      desc: 'Rare beef, lime, onion, roasted rice, herbs.',
      price: 18,
      tags: ['GF', 'DF'],
    },
    {
      id: 'tofusalad',
      name: 'Vegan Herb Salad',
      desc: 'Crispy tofu, mixed herbs, peanuts, vegan nước chấm.',
      price: 15,
      tags: ['VEG', 'GF', 'DF'],
    },
  ],
};
