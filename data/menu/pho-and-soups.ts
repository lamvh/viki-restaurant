import type { MenuCategory } from '@/types/menu';

export const phoAndSoups: MenuCategory = {
  id: 'pho',
  name: 'Phở & Noodle Soups',
  items: [
    {
      id: 'phobo',
      name: 'Phở Bò',
      desc: 'Beef noodle soup, 12-hour bone broth, rare beef & brisket.',
      price: 16,
      tags: ['GF', 'DF'],
      image: '/dishes/pho-bo.jpg',
      groups: [
        {
          id: 'phobo-size',
          title: 'Size',
          type: 'single',
          choices: [
            { id: 'regular', label: 'Regular', price: 0 },
            { id: 'large', label: 'Large', price: 3 },
          ],
        },
        {
          id: 'phobo-addons',
          title: 'Add-ons',
          type: 'multi',
          choices: [
            { id: 'brisket', label: 'Extra brisket', price: 4 },
            { id: 'noodles', label: 'Extra noodles', price: 2 },
            { id: 'chilli', label: 'Chilli oil', price: 0 },
          ],
        },
      ],
    },
    {
      id: 'phoga',
      name: 'Phở Gà',
      desc: 'Chicken noodle soup, poached chicken, ginger broth.',
      price: 15,
      tags: ['GF', 'DF'],
      image: '/dishes/pho-ga.jpg',
    },
    {
      id: 'phochay',
      name: 'Phở Chay',
      desc: 'Vegetable noodle soup, tofu, mushrooms, herb broth.',
      price: 14,
      tags: ['VEG', 'GF', 'DF'],
    },
    {
      id: 'bunbohue',
      name: 'Bún Bò Huế',
      desc: 'Spicy lemongrass beef & pork noodle soup.',
      price: 17,
      tags: ['DF'],
    },
    {
      id: 'hutieu',
      name: 'Hủ Tiếu',
      desc: 'Clear pork & prawn soup, chewy tapioca noodles.',
      price: 16,
      tags: ['DF'],
    },
  ],
};
