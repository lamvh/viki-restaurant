import { Hero } from '@/components/home/hero';
import { PopularDishes } from '@/components/home/popular-dishes';
import { StoryBand } from '@/components/home/story-band';
import { LocationBlock } from '@/components/home/location-block';

// Homepage — the "1b Fresh" direction and entry point to the ordering flow.
export default function HomePage() {
  return (
    <main>
      <Hero />
      <PopularDishes />
      <StoryBand />
      <LocationBlock />
    </main>
  );
}
