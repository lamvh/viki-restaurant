import Link from 'next/link';
import { RESTAURANT } from '@/data/restaurant';

/** Site footer: brand blurb, quick links, address + hours. */
export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface-alt">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="text-2xl text-brand">{RESTAURANT.name}</p>
          <p className="mt-2 max-w-xs text-sm text-muted">{RESTAURANT.blurb}</p>
        </div>

        <nav className="flex flex-col gap-2 text-sm text-subtle" aria-label="Footer">
          <Link href="/menu" className="hover:text-ink">Menu</Link>
          <Link href="/#story" className="hover:text-ink">Our story</Link>
          <Link href="/#location" className="hover:text-ink">Location</Link>
        </nav>

        <div className="text-sm text-muted">
          <p>{RESTAURANT.address}</p>
          <p className="mt-1">{RESTAURANT.phone}</p>
          <dl className="mt-3 space-y-0.5">
            {RESTAURANT.hours.map((h) => (
              <div key={h.days} className="flex justify-between gap-4">
                <dt>{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-muted">
        © {RESTAURANT.name} · {RESTAURANT.suburb}
      </p>
    </footer>
  );
}
