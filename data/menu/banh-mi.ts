import type { MenuCategory } from '@/types/menu';

export const banhMi: MenuCategory = {
  id: 'banhmi',
  name: 'Bánh Mì',
  items: [
    {
      id: 'porkbm',
      name: 'Bánh Mì Thịt',
      desc: 'Roast pork, pâté, pickled carrot & daikon, coriander, chilli.',
      price: 12,
      tags: ['DF'],
      groups: [
        {
          id: 'porkbm-addons',
          title: 'Add-ons',
          type: 'multi',
          choices: [
            { id: 'pate', label: 'Extra pâté', price: 1 },
            { id: 'egg', label: 'Fried egg', price: 2 },
            { id: 'chilli', label: 'Extra chilli', price: 0 },
          ],
        },
      ],
    },
    {
      id: 'chickenbm',
      name: 'Bánh Mì Gà',
      desc: 'Lemongrass chicken, pickles, herbs, chilli mayo.',
      price: 12,
      tags: ['DF'],
    },
    {
      id: 'tofubm',
      name: 'Bánh Mì Chay',
      desc: 'Grilled tofu & mushroom, pickles, vegan mayo.',
      price: 11,
      tags: ['VEG', 'DF'],
    },
    {
      id: 'meatballbm',
      name: 'Bánh Mì Xíu Mại',
      desc: 'Pork meatballs in tomato sauce, pickles, herbs.',
      price: 12,
      tags: ['DF'],
    },
  ],
};
