import { money } from '@/lib/format';
import type { StaffOrderView } from '@/lib/orders/get-order-for-staff';
import { RESTAURANT } from '@/data/restaurant';

/**
 * Itemised food bill, laid out for an 80mm receipt roll.
 *
 * Distinct from the card receipt the terminal prints itself: that one records
 * the card transaction, this one records what was ordered.
 */
export function OrderReceipt({ order }: { order: StaffOrderView }) {
  const placed = new Date(order.createdAt);

  return (
    <div className="receipt mx-auto w-[80mm] max-w-full bg-white p-4 font-mono text-[11px] leading-snug text-black">
      <header className="text-center">
        <p className="text-base font-bold tracking-wide">{RESTAURANT.name.toUpperCase()}</p>
        <p className="mt-0.5">{RESTAURANT.tagline}</p>
        <p className="mt-1">{RESTAURANT.address}</p>
        <p>{RESTAURANT.phone}</p>
      </header>

      <Rule />

      <dl className="grid grid-cols-[auto_1fr] gap-x-2">
        <dt>Order</dt>
        <dd className="text-right font-bold">{order.reference}</dd>
        <dt>Date</dt>
        <dd className="text-right">{placed.toLocaleString('en-NZ')}</dd>
        <dt>Service</dt>
        <dd className="text-right capitalize">{order.service}</dd>
        {order.customerName ? (
          <>
            <dt>Customer</dt>
            <dd className="text-right">{order.customerName}</dd>
          </>
        ) : null}
        {order.customerPhone ? (
          <>
            <dt>Phone</dt>
            <dd className="text-right">{order.customerPhone}</dd>
          </>
        ) : null}
      </dl>

      <Rule />

      <ul>
        {order.items.map((item, index) => (
          <li key={`${item.itemName}-${index}`} className="mb-1.5">
            <div className="flex gap-2">
              <span className="w-6 shrink-0">{item.quantity}×</span>
              <span className="min-w-0 flex-1 break-words">{item.itemName}</span>
              <span className="shrink-0">{money(item.lineTotal)}</span>
            </div>

            {item.options.length ? (
              <p className="pl-8 break-words">+ {item.options.join(', ')}</p>
            ) : null}

            {/* The reason notes are stored at all — this is what the kitchen reads. */}
            {item.notes ? (
              <p className="pl-8 font-bold break-words">** {item.notes}</p>
            ) : null}

            {item.quantity > 1 ? (
              <p className="pl-8 opacity-70">{money(item.unitPrice)} each</p>
            ) : null}
          </li>
        ))}
      </ul>

      <Rule />

      <dl className="grid grid-cols-[1fr_auto] gap-x-2">
        <dt>Subtotal</dt>
        <dd className="text-right">{money(order.subtotal)}</dd>
        {order.subtotal !== order.total ? (
          <>
            <dt>Discount</dt>
            <dd className="text-right">−{money(order.subtotal - order.total)}</dd>
          </>
        ) : null}
        <dt className="mt-1 text-sm font-bold">TOTAL</dt>
        <dd className="mt-1 text-right text-sm font-bold">{money(order.total)}</dd>
      </dl>

      <Rule />

      <p className="text-center">
        {order.paymentStatus === 'paid'
          ? `PAID — ${order.paymentMethod === 'terminal' ? 'CARD' : order.paymentMethod.toUpperCase()}`
          : 'NOT PAID'}
      </p>

      <p className="mt-3 text-center">Cảm ơn quý khách — thank you!</p>

      {/* The terminal's own EFTPOS receipt, captured when the sale completed.
          HIT cannot print our itemised bill on the device, so we do the reverse:
          bring its text here and put both on one piece of paper. */}
      {order.cardReceipt ? (
        <>
          <Rule />
          <pre className="whitespace-pre-wrap break-words text-[10px] leading-tight">
            {order.cardReceipt}
          </pre>
        </>
      ) : null}
    </div>
  );
}

function Rule() {
  return <p className="my-2 overflow-hidden whitespace-nowrap">{'-'.repeat(48)}</p>;
}
