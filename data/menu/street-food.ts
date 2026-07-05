import type { MenuCategory } from '@/types/menu';

export const streetFood: MenuCategory = {
  id: 'street',
  name: 'Street Food',
  items: [
    {
      id: 'goicuon',
      name: 'Gỏi Cuốn',
      desc: 'Fresh rice-paper rolls with prawn, pork & herbs, peanut hoisin.',
      price: 9.5,
      tags: ['GF', 'DF'],
      groups: [
        {
          id: 'goicuon-protein',
          title: 'Filling',
          type: 'single',
          choices: [
            { id: 'prawn-pork', label: 'Prawn & pork', price: 0 },
            { id: 'tofu', label: 'Tofu (vegan)', price: 0 },
          ],
        },
      ],
    },
    {
      id: 'chagio',
      name: 'Chả Giò',
      desc: 'Crispy fried pork & taro spring rolls with nước chấm.',
      price: 10,
      tags: ['DF'],
    },
    {
      id: 'banhxeo',
      name: 'Bánh Xèo',
      desc: 'Turmeric rice crêpe, pork, prawn & beansprouts, herbs to wrap.',
      price: 16,
      tags: ['GF', 'DF'],
    },
    {
      id: 'nemnuong',
      name: 'Nem Nướng',
      desc: 'Grilled lemongrass pork sausage skewers, pickles.',
      price: 13,
      tags: ['GF', 'DF'],
    },
    {
      id: 'khoaichien',
      name: 'Khoai Tây Chiên',
      desc: 'Fish-sauce fries, fried shallots, herbs.',
      price: 8,
      tags: ['VEG', 'GF'],
    },
  ],
};
