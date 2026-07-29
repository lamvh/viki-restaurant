import type { MenuCategory } from '@/types/menu';
// JSON-LD structured data builders, derived from the same data sources as the UI
// so schema stays in sync with what's on the page.

import { RESTAURANT } from '@/data/restaurant';
import { SITE_URL } from './site';

/** Restaurant schema for the homepage (local business + hours + menu link). */
export function restaurantJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: RESTAURANT.name,
    description: RESTAURANT.blurb,
    servesCuisine: 'Vietnamese',
    url: SITE_URL,
    // Generated social image doubles as the LocalBusiness image until real
    // photography lands (Google recommends `image` for Restaurant rich results).
    image: `${SITE_URL}/opengraph-image`,
    telephone: RESTAURANT.phone,
    priceRange: '$$',
    acceptsReservations: false,
    address: {
      '@type': 'PostalAddress',
      streetAddress: RESTAURANT.postal.street,
      addressLocality: RESTAURANT.postal.locality,
      addressRegion: RESTAURANT.postal.region,
      postalCode: RESTAURANT.postal.postalCode,
      addressCountry: RESTAURANT.postal.country,
    },
    openingHoursSpecification: RESTAURANT.openingHours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    // Object form ties the homepage Restaurant node to the Menu node.
    hasMenu: { '@type': 'Menu', url: `${SITE_URL}/menu` },
  };
}

/** Menu schema for the menu page (sections + items + prices). */
export function menuJsonLd(menu: MenuCategory[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: `${RESTAURANT.name} Menu`,
    url: `${SITE_URL}/menu`,
    hasMenuSection: menu.map((category) => ({
      '@type': 'MenuSection',
      name: category.name,
      hasMenuItem: category.items.map((item) => ({
        '@type': 'MenuItem',
        name: item.name,
        description: item.desc,
        offers: {
          '@type': 'Offer',
          // Base ("from") price — option add-ons are not reflected in schema.
          price: item.price.toFixed(2),
          priceCurrency: 'NZD',
        },
      })),
    })),
  };
}
