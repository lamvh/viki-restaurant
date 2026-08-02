import { ImageSlot } from '@/components/ui/image-slot';
import { ORDERING, RESTAURANT } from '@/data/restaurant';
import { moneyLabel } from '@/lib/format';

/** Homepage hero: open status, headline, the two things a visitor can do next. */
export function Hero() {
  return (
    <>
      <section
        id="top"
        className="mx-auto max-w-[840px] scroll-mt-[var(--header-h)] px-4 pb-8 pt-11 text-center sm:px-8 sm:pb-13 sm:pt-19"
      >
        <p className="mb-5 text-[11px] font-bold uppercase tracking-[2px] text-brand">
          {RESTAURANT.openStatusLine}
        </p>

        <h1 className="mb-5 text-pretty text-[clamp(34px,5.4vw,58px)] leading-[1.05] tracking-[-0.5px]">
          Fresh Vietnamese street food,
          <br />
          made daily over charcoal.
        </h1>

        <p className="mx-auto mb-3 max-w-[560px] text-pretty text-[clamp(15px,1.4vw,17.5px)] font-semibold leading-[1.55] text-[#3d3d3d]">
          Order online, ready for pickup in {ORDERING.prepTime} at Glenfield Mall — or{' '}
          {moneyLabel(ORDERING.deliveryFee)} delivery inside {ORDERING.deliveryRadiusKm} km.
        </p>

        <p className="mx-auto mb-7 max-w-[540px] text-pretty text-sm leading-[1.6] text-muted">
          Bánh mì, phở, bún, cơm nướng — cà phê sữa đá và nước mía pha tại quầy. Món Việt gốc Bắc,
          nhiều lựa chọn không gluten &amp; không sữa.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="#menu"
            className="rounded-[10px] bg-brand px-[30px] py-[15px] text-[15px] font-bold text-surface"
          >
            Order online · Đặt món
          </a>
          <a
            href="#delivery-zone"
            className="rounded-[10px] border-[1.5px] border-line-strong px-6 py-[15px] text-[15px] font-semibold text-ink hover:bg-surface-alt"
          >
            Delivery zone · Vùng giao
          </a>
        </div>
      </section>

      <div className="px-4 pb-10 sm:px-8 lg:px-11">
        <ImageSlot
          label="Charcoal platter with herbs and vermicelli"
          src="/dishes/meat-platter-2.jpg"
          alt="Charcoal-grilled pork, chicken wings and prawns on a shared platter with rice paper, vermicelli and a plate of Vietnamese herbs"
          className="h-[clamp(220px,32vw,380px)] w-full rounded-2xl"
        />
      </div>
    </>
  );
}
