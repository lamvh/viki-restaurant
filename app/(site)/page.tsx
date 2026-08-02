import type { Metadata } from 'next';

import { DeliveryZone } from '@/components/home/delivery-zone';
import { FindUs } from '@/components/home/find-us';
import { Hero } from '@/components/home/hero';
import { HomeMenu } from '@/components/home/home-menu';
import { KitchenBand } from '@/components/home/kitchen-band';
import { PopularDishes } from '@/components/home/popular-dishes';
import { JsonLd } from '@/components/seo/json-ld';
import { ORDERING } from '@/data/restaurant';
import { getFeaturedItems, getMenu } from '@/lib/db/get-menu';
import { moneyLabel } from '@/lib/format';
import { restaurantHour } from '@/lib/home/service-window';
import { restaurantJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  description:
    'Viki Vietnamese Street Food, Glenfield Mall — bánh mì, phở, bún, cơm nướng, cà phê sữa đá and ' +
    `nước mía. Order online for pickup in ${ORDERING.prepTime} or flat ` +
    `${moneyLabel(ORDERING.deliveryFee)} delivery within ${ORDERING.deliveryRadiusKm} km.`,
  alternates: { canonical: '/' },
};

/**
 * Menu edits and the lunch/dinner switch both need to reach this page without a
 * deploy, but it is the most-hit URL on the site and should stay cacheable.
 * Fifteen minutes is close enough for a service window the client corrects on
 * mount anyway, and it keeps behaviour identical whether or not Supabase is
 * configured — otherwise the page is static in one environment and dynamic in
 * the other, purely as a side effect of the menu fetch.
 */
export const revalidate = 900;

/**
 * Homepage — hero, popular dishes, the full menu, and the three questions every
 * visitor arrives with: what is this place, do you deliver to me, where are you.
 *
 * The menu appears here *and* at `/menu`. Both pages self-canonicalise: this one
 * wraps the menu in substantially more content, and `/menu` stays the deep-link
 * and structured-data home for it. Only `/menu` emits the `Menu` JSON-LD node,
 * so search engines see one machine-readable menu rather than two.
 */
export default async function HomePage() {
  const [menu, featured] = await Promise.all([getMenu(), getFeaturedItems()]);

  // Read once on the server and hand it down, so the lunch/dinner switch renders
  // identically on both sides of hydration. The client hook takes over after.
  const initialHour = restaurantHour();

  return (
    <main>
      <JsonLd data={restaurantJsonLd()} />
      <Hero />
      <PopularDishes items={featured} initialHour={initialHour} />
      <HomeMenu menu={menu} initialHour={initialHour} />
      <KitchenBand />
      <DeliveryZone />
      <FindUs />
    </main>
  );
}
