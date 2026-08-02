// Static restaurant details used across chrome, the homepage sections and
// JSON-LD. Values confirmed against the "Viki Homepage" design 2026-08-03.

import { moneyLabel } from '@/lib/format';
import { DELIVERY_FEE, DISCOUNT_RATE, DISCOUNT_THRESHOLD } from '@/lib/pricing';

export const RESTAURANT = {
  name: 'Viki',
  tagline: 'Vietnamese Street Food',
  blurb: 'Fresh Vietnamese street food — herbs, char, and balance — in Glenfield.',
  blurbVi: 'Cơm nhà kiểu Hà Nội — nấu bằng than hoa, phục vụ nhanh cho bữa trưa và bữa tối.',

  shop: 'Shop 503A',
  addressLine: 'Glenfield Mall, Shop 503A',
  address: 'Cnr Glenfield Road & Downing Street, Glenfield, Auckland 0629',
  /** Where to actually walk once inside the mall. */
  findingIt:
    'Inside the mall on the ground floor, in the food court — opposite the Countdown entrance, next to the escalator. Look for the red charcoal grill sign.',
  parking: 'Free mall parking, 300+ spaces',
  suburb: 'Glenfield, Auckland',
  mapsUrl: 'https://maps.google.com/?q=Glenfield+Mall+Auckland',

  phone: '+64 9 216 1686',
  /** E.164, for `tel:` links and JSON-LD. */
  phoneHref: 'tel:+6492161686',

  /** Open the same hours every day, so one row says it all. */
  hours: [{ days: 'Open 7 days', time: '11:00am – 8:00pm' }],
  hoursNote: 'Kitchen closes 7:45pm',
  openStatusLine: 'Glenfield Mall · Open 7 days, 11:00am – 8:00pm',

  // Machine-readable address + hours for JSON-LD structured data.
  postal: {
    street: 'Shop 503A, Glenfield Mall, Cnr Glenfield Road & Downing Street',
    locality: 'Glenfield',
    region: 'Auckland',
    postalCode: '0629',
    country: 'NZ',
  },
  openingHours: [
    {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '11:00',
      closes: '20:00',
    },
  ],
} as const;

export type Social = { label: string; href: string; dot: string };

export const SOCIALS: Social[] = [
  {
    label: 'Google Business',
    href: 'https://maps.google.com/?q=Viki+Vietnamese+Glenfield+Mall',
    dot: '#4285F4',
  },
  { label: 'Facebook', href: 'https://facebook.com/vikivietnamesenz', dot: '#1877F2' },
  { label: 'Instagram', href: 'https://instagram.com/viki.vietnamese', dot: '#E1306C' },
];

/**
 * Ordering rules quoted on the homepage.
 *
 * These are marketing copy, not enforcement: checkout still accepts a free-text
 * address. The suburb checker tells a customer what to expect before they order
 * rather than validating anything — see `plans/backlog.md`, "Delivery address
 * validation", for the work that would make this binding.
 */
export const ORDERING = {
  promo: `${DISCOUNT_RATE * 100}% off online orders over ${moneyLabel(DISCOUNT_THRESHOLD)}`,
  /** Re-exported from the pricing module so the quoted fee cannot drift from
      the one actually charged at checkout. */
  deliveryFee: DELIVERY_FEE,
  deliveryRadiusKm: 6,
  prepTime: '15–20 min',
  deliveryEta: '25–35 min',
  /** Suburbs inside the delivery radius. */
  inZone: [
    'Glenfield',
    'Wairau Valley',
    'Bayview',
    'Totara Vale',
    'Birkenhead',
    'Northcote',
    'Hillcrest',
    'Sunnynook',
  ],
  /** Nearby suburbs customers ask about that are pickup-only for now. */
  outZone: ['Albany', 'Takapuna', 'Devonport', 'Henderson'],
  /** Hour (24h) the charcoal grill switches to dinner service. */
  dinnerFromHour: 17,
} as const;
