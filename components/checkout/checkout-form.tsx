'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { totals } from '@/lib/pricing';
import { PaymentMethods, type PaymentMethod } from './payment-methods';

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'address', string>>;

/** Checkout details + payment form. Places a (mock) order on valid submit. */
export function CheckoutForm() {
  const router = useRouter();
  const service = useCartStore((s) => s.service);
  const cart = useCartStore((s) => s.cart);
  const placeOrder = useCartStore((s) => s.placeOrder);
  const t = totals(cart, service);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('card');
  const [errors, setErrors] = useState<Errors>({});

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
    const order = placeOrder();
    if (order) router.push('/order/confirmed');
  }

  const blocked = cart.length === 0 || t.belowDeliveryMin;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field id="name" label="Name" value={name} onChange={setName} error={errors.name} autoComplete="name" />
      <Field id="phone" label="Phone" value={phone} onChange={setPhone} error={errors.phone} type="tel" autoComplete="tel" />
      <Field id="email" label="Email (optional)" value={email} onChange={setEmail} error={errors.email} type="email" autoComplete="email" />
      {service === 'delivery' ? (
        <Field id="address" label="Delivery address" value={address} onChange={setAddress} error={errors.address} autoComplete="street-address" />
      ) : null}

      <PaymentMethods value={payment} onChange={setPayment} />

      {t.belowDeliveryMin ? (
        <p className="text-sm font-medium text-brand">
          Your order is below the delivery minimum — add more or switch to pickup.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={blocked}
        className="rounded-[var(--radius-btn)] bg-brand px-4 py-3 text-sm font-semibold text-surface disabled:opacity-50"
      >
        Place order
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
