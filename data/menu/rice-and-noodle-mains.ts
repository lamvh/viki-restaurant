import type { MenuCategory } from '@/types/menu';

export const riceAndNoodleMains: MenuCategory = {
  id: 'mains',
  name: 'Rice & Noodle Mains',
  items: [
    {
      id: 'comtam',
      name: 'Cơm Tấm',
      desc: 'Broken rice, grilled pork chop, pickles, nước chấm.',
      price: 18,
      tags: ['GF', 'DF'],
      groups: [
        {
          id: 'comtam-addons',
          title: 'Add-ons',
          type: 'multi',
          choices: [
            { id: 'egg', label: 'Fried egg', price: 2 },
            { id: 'skin', label: 'Shredded pork skin', price: 2 },
            { id: 'meatloaf', label: 'Steamed egg meatloaf', price: 3 },
          ],
        },
      ],
    },
    {
      id: 'bunthit',
      name: 'Bún Thịt Nướng',
      desc: 'Vermicelli, grilled pork, spring roll, herbs, nước chấm.',
      price: 17,
      tags: ['GF', 'DF'],
    },
    {
      id: 'garlicnoodle',
      name: 'Mì Xào Tỏi',
      desc: 'Garlic butter egg noodles, spring onion.',
      price: 14,
      tags: ['VEG'],
    },
    {
      id: 'lemongrasschicken',
      name: 'Gà Xả Ớt',
      desc: 'Lemongrass chilli chicken on steamed rice.',
      price: 18,
      tags: ['GF', 'DF'],
    },
    {
      id: 'shakingbeef',
      name: 'Bò Lúc Lắc',
      desc: 'Wok-tossed shaking beef, peppercorn-lime, rice.',
      price: 24,
      tags: ['GF', 'DF'],
    },
  ],
};
