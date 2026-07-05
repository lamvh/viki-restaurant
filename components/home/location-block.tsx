import { ImageSlot } from '@/components/ui/image-slot';
import { RESTAURANT } from '@/data/restaurant';

/** Location + hours block near the bottom of the homepage. */
export function LocationBlock() {
  return (
    <section id="location" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl items-stretch gap-10 px-4 py-16 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl">Find us in Glenfield</h2>
          <p className="text-muted">{RESTAURANT.address}</p>
          <p className="text-muted">{RESTAURANT.phone}</p>
          <dl className="mt-2 max-w-xs space-y-1 text-sm">
            {RESTAURANT.hours.map((h) => (
              <div key={h.days} className="flex justify-between gap-6 border-b border-line py-1">
                <dt className="text-subtle">{h.days}</dt>
                <dd className="text-ink">{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>
        <ImageSlot label="Map — Glenfield Mall" ratio="4 / 3" className="min-h-56 w-full" />
      </div>
    </section>
  );
}
