// Static restaurant details used across chrome + location/footer.

export const RESTAURANT = {
  name: 'Viki',
  tagline: 'Vietnamese street food',
  blurb: 'Fresh Vietnamese street food — herbs, char, and balance — in Glenfield.',
  address: 'Glenfield Mall, 12 Bentley Ave, Glenfield, Auckland 0629',
  suburb: 'Glenfield, Auckland',
  phone: '(09) 444 0000',
  hours: [
    { days: 'Mon – Thu', time: '11:00 – 21:00' },
    { days: 'Fri – Sat', time: '11:00 – 21:30' },
    { days: 'Sunday', time: '11:00 – 20:30' },
  ],
} as const;
