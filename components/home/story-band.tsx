import { ImageSlot } from '@/components/ui/image-slot';

/** Brand story band with an alternate surface background. */
export function StoryBand() {
  return (
    <section id="story" className="scroll-mt-20 bg-surface-alt">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
        <ImageSlot label="Our kitchen" ratio="1 / 1" className="w-full" />
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl">Street food, done properly.</h2>
          <p className="text-muted">
            Viki started with a simple idea: bring the bright, herby, charcoal-kissed
            flavours of Vietnamese street food to Glenfield — cooked fresh, seasoned
            with balance, and served fast.
          </p>
          <p className="text-muted">
            We make our broths from scratch, pickle our own vegetables, and grill to
            order. No shortcuts, just the food we grew up loving.
          </p>
        </div>
      </div>
    </section>
  );
}
