import type { Metadata } from 'next';
import { Hero } from '@/components/home/hero';
import { PopularDishes } from '@/components/home/popular-dishes';
import { StoryBand } from '@/components/home/story-band';
import { LocationBlock } from '@/components/home/location-block';
import { JsonLd } from '@/components/seo/json-ld';
import { restaurantJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

// Homepage — the "1b Fresh" direction and entry point to the ordering flow.
export default function HomePage() {
  return (
    <main>
      <JsonLd data={restaurantJsonLd()} />
      <Hero />
      <PopularDishes />
      <StoryBand />
      <LocationBlock />
    </main>
  );
}
