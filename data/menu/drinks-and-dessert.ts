import type { MenuCategory } from '@/types/menu';

export const drinksAndDessert: MenuCategory = {
  id: 'drinks',
  name: 'Drinks & Dessert',
  items: [
    {
      id: 'caphe',
      name: 'Cà Phê Sữa Đá',
      desc: 'Vietnamese iced coffee with condensed milk.',
      price: 6,
      tags: ['VEG'],
    },
    {
      id: 'trasua',
      name: 'Trà Sữa',
      desc: 'Milk tea with tapioca pearls.',
      price: 7,
      tags: ['VEG'],
      groups: [
        {
          id: 'trasua-sugar',
          title: 'Sugar',
          type: 'single',
          choices: [
            { id: 'sugar-100', label: '100%', price: 0 },
            { id: 'sugar-50', label: '50%', price: 0 },
            { id: 'sugar-0', label: '0%', price: 0 },
          ],
        },
        {
          id: 'trasua-ice',
          title: 'Ice',
          type: 'single',
          choices: [
            { id: 'ice-regular', label: 'Regular', price: 0 },
            { id: 'ice-less', label: 'Less ice', price: 0 },
          ],
        },
      ],
    },
    {
      id: 'saigonbeer',
      name: 'Saigon Beer',
      desc: 'Chilled Vietnamese lager, 330ml.',
      price: 9,
      tags: ['R18', 'VEG'],
    },
    {
      id: 'che',
      name: 'Chè Ba Màu',
      desc: 'Three-colour dessert, mung bean, red bean, coconut cream.',
      price: 8,
      tags: ['VEG'],
    },
  ],
};
