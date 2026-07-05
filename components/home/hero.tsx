import Link from 'next/link';
import { ImageSlot } from '@/components/ui/image-slot';
import { RESTAURANT } from '@/data/restaurant';

/** Homepage hero: headline, blurb, primary CTAs, and a product image. */
export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
      <div className="flex flex-col gap-6">
        <p className="text-sm font-medium uppercase tracking-widest text-brand">
          {RESTAURANT.tagline} · {RESTAURANT.suburb}
        </p>
        <h1 className="text-5xl leading-[1.05] md:text-6xl">
          Fresh Vietnamese street food, made to order.
        </h1>
        <p className="max-w-md text-lg text-muted">{RESTAURANT.blurb}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/menu"
            className="rounded-[var(--radius-btn)] bg-brand px-5 py-3 text-sm font-semibold text-surface"
          >
            Order online
          </Link>
          <Link
            href="/#location"
            className="rounded-[var(--radius-btn)] border border-line-strong px-5 py-3 text-sm font-semibold text-ink hover:bg-surface-alt"
          >
            Find us
          </Link>
        </div>
      </div>
      <ImageSlot
        label="Hero — Phở & fresh herbs"
        ratio="4 / 3"
        className="w-full"
      />
    </section>
  );
}
