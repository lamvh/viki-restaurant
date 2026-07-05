'use client';

export type PaymentMethod = 'card' | 'cash';

const METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'card', label: 'Card', hint: 'Pay securely on pickup or delivery' },
  { value: 'cash', label: 'Cash', hint: 'Pay in person' },
];

/** Payment method selector (mock — no real payment this milestone). */
export function PaymentMethods({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Payment</legend>
      <div className="grid gap-2">
        {METHODS.map((method) => (
          <label
            key={method.value}
            className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-btn)] border p-3 ${
              value === method.value ? 'border-brand' : 'border-line'
            }`}
          >
            <input
              type="radio"
              name="payment"
              checked={value === method.value}
              onChange={() => onChange(method.value)}
              className="mt-1 accent-[var(--color-brand)]"
            />
            <span>
              <span className="block text-sm font-medium">{method.label}</span>
              <span className="block text-xs text-muted">{method.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
