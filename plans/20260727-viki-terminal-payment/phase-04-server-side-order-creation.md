# Phase 04 — Server-Side Order Creation (Pay on Collection)

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-terminal-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-terminal-payment-design.md) (§5.1 flow, §5.2 trust model, §6 data model)
- Depends on: 03
- Unblocks: 05, 06

## Overview
- **Priority:** P1
- **Status:** ✅ done
- **Description:** The missing server-side order path. A server action validates the checkout payload, **recomputes every price from trusted menu data**, and persists `orders` + `order_items` via the service-role client. Ships the **cash branch end to end** — a complete, working, independently valuable order flow with no gateway involved.

## Key Insights
- **The client's `unit` and `total` are untrusted input.** They exist for display. The server rebuilds unit prices from `data/menu` via the existing `lineUnit()` and recomputes totals via `totals()` in `lib/pricing.ts`. Same module both sides, so displayed and charged prices cannot drift.
- **`CartLine` does not currently retain choice ids** — only `key` and display `labels`. The `key` format is `itemId|choiceIds|notes`, but `notes` is free text that may contain `|`, so parsing it back is ambiguous. Add an explicit `choiceIds: string[]` to `CartLine` instead of parsing.
- Adding that field invalidates carts already in `localStorage`. Bump the Zustand `persist` version with a `migrate` that drops the stale cart — losing one in-progress cart once is far cheaper than shipping an ambiguous parser.
- Menu prices still come from static `data/menu/*`; the admin milestone's `lib/db` menu rewiring is not done. Read through **one function** so the later swap to a DB read touches a single call site.
- Cash orders go straight to `status='new'`, `payment_status='unpaid'` — they are real kitchen work immediately.

## Requirements
**Functional**
- `submitCheckout(payload)` validates name, phone, optional email, and delivery address.
- Unknown item id, unknown choice id, non-positive qty, or a choice not belonging to the item's groups → rejected.
- Server-recomputed subtotal/discount/fee/total are what get persisted.
- Delivery below `DELIVERY_MIN` is rejected server-side, not only in the UI.
- Cash order persists and returns its `public_token` for redirect.
- Every order gets a unique `VK-XXXXXX` reference and two independent opaque tokens.

**Non-functional**
- All writes through the service-role client (anon can no longer insert after Phase 01).
- Each file under 200 lines, kebab-case.
- Pure logic (`reference`, price rebuild, validation) unit-testable with no DB.

## Architecture
- `lib/orders/reference.ts` — pure id generation.
- `lib/orders/rebuild-cart.ts` — untrusted wire lines → trusted `CartLine[]`, or a validation error. **The security boundary.**
- `lib/orders/create-order.ts` — orchestrates rebuild → totals → insert. Returns `{ orderId, publicToken, reference, total }`.
- `app/(site)/checkout/actions.ts` — the `'use server'` entry point; field validation and branching.

## Related Code Files
**Create**
- `lib/orders/reference.ts`
- `lib/orders/rebuild-cart.ts`
- `lib/orders/create-order.ts`
- `app/(site)/checkout/actions.ts`
- `lib/orders/rebuild-cart.test.ts`
- `lib/orders/reference.test.ts`

**Modify**
- `types/cart.ts` (add `choiceIds` to `CartLine`; add `CheckoutPayload` / `CheckoutLineInput`)
- `lib/build-cart-line.ts` (populate `choiceIds` in `buildCartLine`)
- `store/cart-store.ts` (persist `version: 1` + `migrate` dropping stale carts)

**Delete:** none

## Implementation Steps

1. Extend `types/cart.ts`:

```ts
export type CartLine = {
  key: string;
  id: string;
  name: string;
  unit: number;
  qty: number;
  labels: string[];
  notes: string;
  /** Selected option choice ids — the trusted basis for server-side repricing. */
  choiceIds: string[];
};

/** Untrusted wire shape sent to the server. Prices are deliberately absent. */
export type CheckoutLineInput = {
  itemId: string;
  choiceIds: string[];
  qty: number;
  notes: string;
};

export type CheckoutPayload = {
  service: Service;
  lines: CheckoutLineInput[];
  name: string;
  phone: string;
  email: string;
  address: string;
  paymentMethod: 'card' | 'cash';
};
```

2. In `lib/build-cart-line.ts`, add `choiceIds` to the `buildCartLine` return:

```ts
    choiceIds: chosenChoices(item, selections)
      .map((c) => c.choiceId)
      .sort(),
```

3. In `store/cart-store.ts`, bump the persist config so stale carts without `choiceIds` are discarded rather than silently repriced wrong:

```ts
    {
      name: 'viki-cart',
      version: 1,
      // v0 lines predate `choiceIds`; they cannot be repriced safely server-side.
      migrate: (state, version) => (version === 0 ? { ...(state as object), cart: [] } : state),
      partialize: (state) => ({
        service: state.service,
        cart: state.cart,
        lastOrder: state.lastOrder,
      }),
    },
```

4. Write `lib/orders/reference.ts`:

```ts
import { randomBytes } from 'node:crypto';

// Crockford-style alphabet: no I, L, O, U — unambiguous when read aloud on the phone.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function token(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Human-quotable order reference, e.g. "VK-7KQ2X9". Unique index guards collisions. */
export function orderReference(): string {
  return `VK-${token(6)}`;
}

/** Opaque 32-char URL token. Used separately for public and notification URLs. */
export function opaqueToken(): string {
  return randomBytes(24).toString('base64url');
}
```

5. Write `lib/orders/rebuild-cart.ts` — the security boundary:

```ts
import { findItem } from '@/data/menu';
import { buildCartLine, type Selections } from '@/lib/build-cart-line';
import type { CartLine, CheckoutLineInput } from '@/types/cart';

export type RebuildResult =
  | { ok: true; lines: CartLine[] }
  | { ok: false; error: string };

/**
 * Rebuilds trusted cart lines from untrusted wire input. Prices come only from
 * the menu — never from the client. Any unknown id or malformed selection is a
 * hard rejection rather than a silently-dropped option.
 */
export function rebuildCart(input: CheckoutLineInput[]): RebuildResult {
  if (input.length === 0) return { ok: false, error: 'Your cart is empty.' };

  const lines: CartLine[] = [];

  for (const raw of input) {
    const item = findItem(raw.itemId);
    if (!item) return { ok: false, error: `Unknown menu item: ${raw.itemId}` };

    if (!Number.isInteger(raw.qty) || raw.qty < 1 || raw.qty > 50) {
      return { ok: false, error: `Invalid quantity for ${item.name}.` };
    }

    const selections: Selections = {};
    const known = new Set<string>();

    for (const group of item.groups ?? []) {
      const picked = group.choices
        .filter((choice) => raw.choiceIds.includes(choice.id))
        .map((choice) => choice.id);

      if (group.type === 'single' && picked.length > 1) {
        return { ok: false, error: `Only one ${group.title} may be selected.` };
      }

      selections[group.id] = picked;
      for (const choice of group.choices) known.add(choice.id);
    }

    const unknown = raw.choiceIds.find((id) => !known.has(id));
    if (unknown) return { ok: false, error: `Unknown option: ${unknown}` };

    lines.push(buildCartLine(item, selections, raw.qty, String(raw.notes ?? '').slice(0, 500)));
  }

  return { ok: true, lines };
}
```

6. Write `lib/orders/create-order.ts`:

```ts
import 'server-only';

import { createServiceClient } from '@/lib/supabase/service-client';
import { totals } from '@/lib/pricing';
import { rebuildCart } from './rebuild-cart';
import { orderReference, opaqueToken } from './reference';
import type { CheckoutPayload } from '@/types/cart';

export type CreatedOrder = {
  orderId: string;
  reference: string;
  publicToken: string;
  notificationToken: string;
  total: number;
};

export type CreateOrderResult =
  | { ok: true; order: CreatedOrder }
  | { ok: false; error: string };

export async function createOrder(payload: CheckoutPayload): Promise<CreateOrderResult> {
  const rebuilt = rebuildCart(payload.lines);
  if (!rebuilt.ok) return { ok: false, error: rebuilt.error };

  // Server-side authority: the client's displayed total is never persisted.
  const t = totals(rebuilt.lines, payload.service);
  if (t.belowDeliveryMin) {
    return { ok: false, error: 'Your order is below the delivery minimum.' };
  }

  const isCash = payload.paymentMethod === 'cash';
  const order: CreatedOrder = {
    orderId: '',
    reference: orderReference(),
    publicToken: opaqueToken(),
    notificationToken: opaqueToken(),
    total: t.total,
  };

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('orders')
    .insert({
      service: payload.service,
      customer_name: payload.name,
      customer_phone: payload.phone,
      email: payload.email || null,
      address: payload.service === 'delivery' ? payload.address : null,
      subtotal: t.subtotal,
      total: t.total,
      reference: order.reference,
      public_token: order.publicToken,
      notification_token: order.notificationToken,
      payment_method: payload.paymentMethod,
      payment_status: isCash ? 'unpaid' : 'pending',
      status: isCash ? 'new' : 'pending_payment',
    })
    .select('id')
    .single();

  if (error || !data) return { ok: false, error: 'Could not create your order.' };

  const items = rebuilt.lines.map((line) => ({
    order_id: data.id,
    item_name: line.name,
    unit_price: line.unit,
    quantity: line.qty,
    options: line.labels,
    line_total: line.unit * line.qty,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(items);
  if (itemsError) {
    // Never leave a payable order with no lines behind it.
    await supabase.from('orders').delete().eq('id', data.id);
    return { ok: false, error: 'Could not create your order.' };
  }

  return { ok: true, order: { ...order, orderId: data.id } };
}
```

7. Write `app/(site)/checkout/actions.ts` with the cash branch complete. Card returns a not-yet-implemented error until Phase 04:

```ts
'use server';

import { redirect } from 'next/navigation';
import { createOrder } from '@/lib/orders/create-order';
import type { CheckoutPayload } from '@/types/cart';

export type CheckoutResult = { error: string };

function validate(payload: CheckoutPayload): string | null {
  if (!payload.name.trim()) return 'Please enter your name.';
  if (!/^[0-9 +()-]{6,}$/.test(payload.phone.trim())) return 'Enter a valid phone number.';
  if (payload.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email.trim()))
    return 'Enter a valid email address.';
  if (payload.service === 'delivery' && !payload.address.trim())
    return 'Delivery address is required.';
  return null;
}

export async function submitCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  const invalid = validate(payload);
  if (invalid) return { error: invalid };

  const created = await createOrder(payload);
  if (!created.ok) return { error: created.error };

  if (payload.paymentMethod === 'cash') {
    redirect(`/order/${created.order.publicToken}`);
  }

  // Online card payment is a separate, currently on-hold milestone. Checkout
  // offers only pay-on-collection today, so this branch is unreachable from the
  // UI — it exists so the union stays honest rather than silently charging $0.
  return { error: 'Online card payment is not available yet.' };
}
```

**Checkout offers one option this milestone: pay on collection.** The customer
chooses nothing about *how* — staff take cash or charge the card terminal at the
counter, and `payment_method` moves from `cash` to `terminal` if the reader is
used. The existing Card/Cash selector in `components/checkout/payment-methods.tsx`
is reduced accordingly in Phase 03.

8. Write `lib/orders/rebuild-cart.test.ts` covering: a known item repricing correctly regardless of what the client claimed; unknown item id rejected; unknown choice id rejected; two choices in a `single` group rejected; qty 0 and qty 51 rejected; empty cart rejected.

9. Write `lib/orders/reference.test.ts`: `orderReference()` matches `/^VK-[0-9A-HJKMNP-TV-Z]{6}$/`; 1000 generations produce no duplicate; `opaqueToken()` is URL-safe and at least 32 chars.

10. Run `npm test`, `npm run lint`, `npm run build`.

## Todo List
- [x] `types/cart.ts` extended with `choiceIds`, `CheckoutLineInput`, `CheckoutPayload`
- [x] `buildCartLine` populates `choiceIds`
- [x] Cart persist `version: 1` + migrate drops v0 carts
- [x] `lib/orders/reference.ts` + 5 tests green
- [x] `lib/orders/rebuild-cart.ts` + 10 tests green (mocked menu covers option-group rules)
- [x] `lib/orders/create-order.ts` (service-role, rollback on item insert failure)
- [x] `app/(site)/checkout/actions.ts` with pay-on-collection branch
- [x] `tsc` / `lint` / 111 tests green; insert shape verified against the live schema

## Success Criteria
1. A cash order inserts one `orders` row and matching `order_items`, then redirects to `/order/{public_token}` (page arrives in Phase 06 — verify the row and the redirect target for now).
2. A payload claiming `unit: 0.01` is charged the real menu price.
3. Unknown item or choice ids are rejected, not silently dropped.
4. Delivery below the minimum is rejected server-side even with the UI guard bypassed.
5. A failed `order_items` insert leaves no orphan order.

## Risk Assessment
- **Stale localStorage carts** → persist `migrate` clears them; users see an empty cart once.
- **`options` column shape** — `order_items.options` is `jsonb default '[]'`; storing `line.labels` (a string array) matches the existing frozen-snapshot intent.
- **No transaction across the two inserts** — Supabase's REST client has no multi-table transaction. The compensating delete covers it; a Postgres function could replace this later if orphans ever appear.

## Security Considerations
- `rebuildCart` is the boundary that makes every downstream amount trustworthy. Review it as such.
- Notes are length-capped at 500 chars to bound what reaches the kitchen ticket and the DB.
- The service-role client is `server-only`; `actions.ts` is `'use server'` and never imported client-side.

## Next Steps
Phase 04 replaces the card branch's placeholder error with real session creation, using `created.order` exactly as returned here.
