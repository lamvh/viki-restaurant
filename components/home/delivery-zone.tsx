'use client';

import { useState } from 'react';

import { ORDERING, RESTAURANT } from '@/data/restaurant';
import { moneyLabel } from '@/lib/format';

const FEE = moneyLabel(ORDERING.deliveryFee);

const FACTS = [
  {
    label: 'Delivery',
    value: `Flat ${FEE} inside ${ORDERING.deliveryRadiusKm} km · ${ORDERING.deliveryEta} · no minimum order`,
  },
  {
    label: 'Pickup',
    value: `Free · ready in ${ORDERING.prepTime} · ${RESTAURANT.shop}, ground floor food court`,
  },
  { label: 'Payment', value: 'Card, Apple Pay, Google Pay online · cash accepted in store' },
  {
    label: 'Big orders',
    value: `6+ mains or a whole charcoal chicken — call ahead on ${RESTAURANT.phone}`,
  },
];

/**
 * Suburb checker for the delivery zone.
 *
 * This sets expectations before someone orders; it does not gate checkout, which
 * still takes a free-text address. Anything stricter needs the address
 * validation work tracked in the backlog, not a chip list.
 */
export function DeliveryZone() {
  const [suburb, setSuburb] = useState<string | null>(null);

  const inZone = suburb !== null && (ORDERING.inZone as readonly string[]).includes(suburb);

  return (
    <section
      id="delivery-zone"
      className="grid scroll-mt-[var(--header-h)] items-start gap-[clamp(22px,3vw,44px)] px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-2 lg:px-11"
    >
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[2px] text-brand">
          Delivery zone · Vùng giao hàng
        </p>
        <h2 className="mb-3 text-[clamp(24px,3.2vw,32px)]">
          We deliver within {ORDERING.deliveryRadiusKm} km of Glenfield Mall
        </h2>
        <p className="mb-5 text-pretty text-[14.5px] leading-[1.6] text-subtle">
          Flat {FEE} anywhere in the zone, no minimum. Outside it, order for pickup —{' '}
          {ORDERING.outZone.slice(0, 2).join(' and ')} are pickup only for now.
        </p>

        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[1.4px] text-[#8a8a8a]">
          Tap your suburb
        </p>
        <div className="flex flex-wrap gap-2">
          {[...ORDERING.inZone, ...ORDERING.outZone].map((name) => {
            const active = suburb === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSuburb(name)}
                aria-pressed={active}
                className={`rounded-[var(--radius-pill)] border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
                  active
                    ? 'border-ink bg-ink text-surface'
                    : 'border-line-strong bg-surface text-subtle hover:border-ink/40'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        <div
          aria-live="polite"
          className={`mt-4 rounded-[12px] border px-4 py-3.5 ${
            suburb === null
              ? 'border-line bg-[#F7F7F5] text-[#4a4a4a]'
              : inZone
                ? 'border-[#CFE3D6] bg-[#EEF6F1] text-[#1f4a36]'
                : 'border-[#F0DAD5] bg-[#FBEFEC] text-[#8f2718]'
          }`}
        >
          <p className="mb-0.5 text-[14.5px] font-bold">
            {suburb === null
              ? 'Pick a suburb to check'
              : `${suburb} — ${inZone ? 'inside the zone' : 'outside the zone'}`}
          </p>
          <p className="text-[13px] leading-[1.5]">
            {suburb === null
              ? `Delivery covers ${ORDERING.inZone.slice(0, 4).join(', ')} and nearby streets.`
              : inZone
                ? `Flat ${FEE} delivery, typically ${ORDERING.deliveryEta} from the kitchen.`
                : `No delivery here yet. Pickup at Glenfield Mall takes ${ORDERING.prepTime} and is free.`}
          </p>
        </div>
      </div>

      <div className="rounded-[14px] border border-line bg-[#F7F7F5] px-[22px] py-5">
        <h3 className="mb-3.5 font-body text-[15px] font-bold">How it works</h3>
        {FACTS.map((fact) => (
          <div key={fact.label} className="flex gap-3 border-b border-line py-[11px]">
            <span className="w-[76px] shrink-0 text-xs font-bold text-brand">{fact.label}</span>
            <span className="text-[13px] leading-[1.5] text-[#4a4a4a]">{fact.value}</span>
          </div>
        ))}
        <p className="mt-3.5 text-[12.5px] leading-[1.55] text-[#8a8a8a]">
          Outside the zone? Pickup is always free and your order is ready in {ORDERING.prepTime}.
        </p>
      </div>
    </section>
  );
}
