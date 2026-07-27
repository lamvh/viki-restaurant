'use client';

import { useState, useTransition } from 'react';

import { submitCheckout } from '@/app/(site)/checkout/actions';
import { totals } from '@/lib/pricing';
import { useCartStore } from '@/store/cart-store';
import type { CheckoutLineInput } from '@/types/cart';

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'address', string>>;

/** Checkout details form. Submits to the server, which prices and persists the order. */
export function CheckoutForm({ cardEnabled }: { cardEnabled: boolean }) {
  const service = useCartStore((s) => s.service);
  const cart = useCartStore((s) => s.cart);
  const t = totals(cart, service);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState<'card' | 'cash'>(cardEnabled ? 'card' : 'cash');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function validate(): Errors {
    const e: Errors = {};
    if (!name.trim()) e.name = 'Please enter your name.';
    if (!/^[0-9 +()-]{6,}$/.test(phone.trim())) e.phone = 'Enter a valid phone number.';
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      e.email = 'Enter a valid email address.';
    if (service === 'delivery' && !address.trim())
      e.address = 'Delivery address is required.';
    return e;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (t.belowDeliveryMin || cart.length === 0) return;

    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    // Prices are deliberately absent — the server rebuilds every line from the
    // menu, so anything sent here about cost would be ignored anyway.
    const lines: CheckoutLineInput[] = cart.map((line) => ({
      itemId: line.id,
      choiceIds: line.choiceIds,
      qty: line.qty,
      notes: line.notes,
    }));

    setFormError(null);
    startTransition(async () => {
      // On success the action redirects; only failures return here. The cart is
      // deliberately left intact — it is cleared on the confirmation page.
      const result = await submitCheckout({
        service,
        lines,
        name,
        phone,
        email,
        address,
        paymentMethod: cardEnabled ? payment : 'cash',
      });

      if ('error' in result) {
        setFormError(result.error);
        return;
      }

      // The hosted payment page is cross-origin, so router.push cannot reach it.
      if ('redirectUrl' in result) window.location.href = result.redirectUrl;
    });
  }

  const blocked = cart.length === 0 || t.belowDeliveryMin || pending;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field id="name" label="Name" value={name} onChange={setName} error={errors.name} autoComplete="name" />
      <Field id="phone" label="Phone" value={phone} onChange={setPhone} error={errors.phone} type="tel" autoComplete="tel" />
      <Field id="email" label="Email (optional)" value={email} onChange={setEmail} error={errors.email} type="email" autoComplete="email" />
      {service === 'delivery' ? (
        <Field id="address" label="Delivery address" value={address} onChange={setAddress} error={errors.address} autoComplete="street-address" />
      ) : null}

      {cardEnabled ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Payment</legend>
          <div className="grid gap-2">
            {(
              [
                ['card', 'Pay now by card', 'Secure payment page — Visa, Mastercard, wallets'],
                ['cash', 'Pay on collection', 'Cash or card on our terminal when you arrive'],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-btn)] border p-3 ${
                  payment === value ? 'border-brand' : 'border-line'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={payment === value}
                  onChange={() => setPayment(value)}
                  className="mt-1 accent-[var(--color-brand)]"
                />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="rounded-[var(--radius-btn)] border border-line p-3">
          <p className="text-sm font-semibold">Payment</p>
          <p className="mt-1 text-xs text-muted">
            Pay when you collect — cash, or card on our terminal.
          </p>
        </div>
      )}

      {t.belowDeliveryMin ? (
        <p className="text-sm font-medium text-brand">
          Your order is below the delivery minimum — add more or switch to pickup.
        </p>
      ) : null}

      {formError ? (
        <p role="alert" className="text-sm font-medium text-brand">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={blocked}
        className="rounded-[var(--radius-btn)] bg-brand px-4 py-3 text-sm font-semibold text-surface disabled:opacity-50"
      >
        {pending
          ? cardEnabled && payment === 'card'
            ? 'Redirecting to payment…'
            : 'Placing order…'
          : cardEnabled && payment === 'card'
            ? 'Pay now'
            : 'Place order'}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-[var(--radius-btn)] border border-line px-3 py-2 text-sm outline-none focus:border-brand"
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}
