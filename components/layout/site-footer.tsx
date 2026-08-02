import Link from 'next/link';

import { RESTAURANT, SOCIALS } from '@/data/restaurant';

/** Dark site footer: brand, ordering links, socials, address + hours. */
export function SiteFooter() {
  const hours = RESTAURANT.hours[0];

  return (
    <footer className="bg-ink px-4 pb-[30px] pt-8 text-[#E8E4DC] sm:px-8 sm:pt-12 lg:px-11">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-7 border-b border-white/12 pb-[26px]">
        <div>
          <div className="mb-2.5 flex items-baseline gap-2.5">
            <span className="font-display text-[26px] text-white">{RESTAURANT.name}</span>
            <span className="text-[9px] font-bold uppercase tracking-[2px] text-[#8a8579]">
              Glenfield
            </span>
          </div>
          <p className="text-[13px] leading-[1.6] text-[#a5a09a]">{RESTAURANT.blurbVi}</p>
        </div>

        <div>
          <h2 className="mb-[11px] font-body text-[11px] font-bold uppercase tracking-[1.5px] text-[#8a8579]">
            Order
          </h2>
          <div className="flex flex-col gap-2 text-[13.5px]">
            <Link href="/menu" className="text-[#E8E4DC] hover:text-white">
              Full menu
            </Link>
            <Link href="/#delivery-zone" className="text-[#E8E4DC] hover:text-white">
              Delivery zone
            </Link>
            <a href={RESTAURANT.phoneHref} className="text-[#E8E4DC] hover:text-white">
              Order by phone
            </a>
          </div>
        </div>

        <div>
          <h2 className="mb-[11px] font-body text-[11px] font-bold uppercase tracking-[1.5px] text-[#8a8579]">
            Follow
          </h2>
          <div className="flex flex-col gap-2 text-[13.5px]">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="text-[#E8E4DC] hover:text-white"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-[11px] font-body text-[11px] font-bold uppercase tracking-[1.5px] text-[#8a8579]">
            Visit
          </h2>
          <p className="text-[13.5px] leading-[1.6] text-[#a5a09a]">
            {RESTAURANT.addressLine}
            <br />
            {RESTAURANT.suburb} 0629
            <br />
            {hours.time}, {hours.days.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-3.5 pt-[18px] text-xs text-[#8a8579]">
        <span>© {new Date().getFullYear()} Viki Vietnamese Street Food Ltd</span>
        <span>{RESTAURANT.blurb}</span>
      </div>
    </footer>
  );
}
