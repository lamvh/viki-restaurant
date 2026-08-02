import { ImageSlot } from '@/components/ui/image-slot';
import { RESTAURANT, SOCIALS } from '@/data/restaurant';

/** "Find us" — how to actually reach the shop inside the mall, plus a map. */
export function FindUs() {
  const hours = RESTAURANT.hours[0];

  return (
    <section
      id="find-us"
      className="grid scroll-mt-[var(--header-h)] items-center gap-[clamp(22px,3vw,44px)] border-t border-line px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-2 lg:px-11"
    >
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[2px] text-brand">
          Find us · Địa chỉ
        </p>
        <h2 className="mb-2 text-[clamp(24px,3.2vw,32px)]">{RESTAURANT.addressLine}</h2>

        <p className="mb-3.5 text-pretty text-[14.5px] font-semibold leading-[1.6] text-[#3d3d3d]">
          {RESTAURANT.findingIt}
        </p>
        <p className="mb-1.5 text-sm leading-[1.6] text-subtle">{RESTAURANT.address}</p>
        <p className="mb-4.5 text-sm leading-[1.6] text-subtle">
          {hours.days} · {hours.time} ({RESTAURANT.hoursNote}) · {RESTAURANT.parking}
        </p>

        <div className="mb-4.5 flex flex-wrap gap-2.5">
          <a
            href={RESTAURANT.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-[10px] bg-ink px-[22px] py-3 text-sm font-bold text-surface"
          >
            Get directions
          </a>
          <a
            href={RESTAURANT.phoneHref}
            className="rounded-[10px] border-[1.5px] border-line-strong px-5 py-3 text-sm font-semibold text-ink hover:bg-surface-alt"
          >
            Call {RESTAURANT.phone}
          </a>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-line-strong px-[15px] py-2.5 text-[13px] font-semibold text-ink hover:border-ink/40"
            >
              <span
                aria-hidden="true"
                className="h-[7px] w-[7px] rounded-full"
                style={{ backgroundColor: social.dot }}
              />
              {social.label}
            </a>
          ))}
        </div>
      </div>

      <ImageSlot
        label="Map — Glenfield Mall"
        src="https://assets.foodhub.com/site/277e0c60adb34451917962d04dc18e0a/staticmaps/map696e552363176.png"
        alt={`Map showing ${RESTAURANT.name} at Glenfield Mall on the corner of Glenfield Road and Downing Street, Auckland`}
        className="h-[clamp(200px,26vw,280px)] w-full rounded-[14px]"
      />
    </section>
  );
}
