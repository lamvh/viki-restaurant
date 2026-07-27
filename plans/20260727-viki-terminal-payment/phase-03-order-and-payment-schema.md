# Phase 03 — Order + Payment Schema

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-27-viki-terminal-payment-design.md](../../docs/superpowers/specs/2026-07-27-viki-terminal-payment-design.md) (§5.4 security, §6 data model)
- Depends on: 02
- Unblocks: 04

## Overview
- **Priority:** P1 (blocks everything)
- **Status:** pending
- **Description:** Migration `0005` extends `orders` with identity and payment columns for **both** channels, adds `payment_events`, widens the status constraint, and drops the anon-insert RLS hole. Schema only — no runtime behaviour changes.

## Key Insights
- **This migration covers both channels deliberately.** The online milestone is on hold, but adding its columns now means it needs no further schema work later, and there is no second migration to coordinate against live data. Unused columns cost nothing.
- `0004_rls_policies.sql` is **already applied — do not edit it.** `0005` issues `drop policy` instead, so migration history stays replayable.
- `orders` has no rows in practice (nothing has ever written to it), but the migration must still be safe if rows exist. Add nullable → backfill → set not null.
- The inline `check (status in (...))` in `0002` is auto-named `orders_status_check` by Postgres. It must be dropped by that name before the widened constraint is added.
- Two tokens, not one. `public_token` ends up in URLs customers screenshot and paste into support chats; `notification_token` authenticates the online channel's webhook. Sharing one secret across those roles is the bug this avoids.
- `payment_method` carries three values. An order placed as **`cash`** (pay in person) becomes **`terminal`** if charged on the card reader, or stays **`cash`** if staff settle it with notes; **`card`** is reserved for the online channel.
- **`unpaid` and `failed` both mean "not complete".** Either can be resolved by retrying the terminal, settling as cash, or surfacing an error to staff. They are not terminal states.

## Requirements
**Functional**
- `orders` gains `reference`, `public_token`, `notification_token`, `payment_method`, `payment_status`, `paid_at`, `email`, `address`, the online channel's `windcave_*` columns, and HIT's `hit_txn_ref` / `hit_attempt`.
- `orders.status` accepts `pending_payment` in addition to the existing five.
- `payment_events` records every gateway and terminal interaction.
- `orders_anon_insert` and `order_items_anon_insert` policies are gone.

**Non-functional**
- Migration is idempotent (`if not exists` / `if exists`) and safe on a non-empty table.
- No secret values in any committed file.

## Related Code Files
**Create**
- `supabase/migrations/0005_payments.sql`

**Modify**
- `types/supabase.ts` (regenerate)

**Delete:** none

## Implementation Steps

1. Write `supabase/migrations/0005_payments.sql`:

```sql
-- Payment support: order identity tokens, gateway + terminal linkage, audit trail.
-- Covers both the card-present (HIT) and online (REST/HPP) channels so no second
-- migration is needed when the online milestone resumes.

-- 1. Identity + payment columns. Added nullable, backfilled, then constrained,
--    so the migration is safe if orders already holds rows.
alter table orders add column if not exists reference text;
alter table orders add column if not exists public_token text;
alter table orders add column if not exists notification_token text;
alter table orders add column if not exists payment_method text;
alter table orders add column if not exists payment_status text;
alter table orders add column if not exists paid_at timestamptz;
alter table orders add column if not exists email text;
alter table orders add column if not exists address text;

-- Card-present (HIT) channel.
alter table orders add column if not exists hit_txn_ref text;
alter table orders add column if not exists hit_attempt int not null default 0;

-- Online (REST/HPP) channel — unused until that milestone resumes.
alter table orders add column if not exists windcave_session_id text;
alter table orders add column if not exists windcave_transaction_id text;
alter table orders add column if not exists windcave_links jsonb;

update orders set
  reference          = coalesce(reference, 'VK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  public_token       = coalesce(public_token, replace(gen_random_uuid()::text, '-', '')),
  notification_token = coalesce(notification_token, replace(gen_random_uuid()::text, '-', '')),
  payment_method     = coalesce(payment_method, 'cash'),
  payment_status     = coalesce(payment_status, 'unpaid');

alter table orders alter column reference set not null;
alter table orders alter column public_token set not null;
alter table orders alter column notification_token set not null;
alter table orders alter column payment_method set not null;
alter table orders alter column payment_status set not null;

-- 2. Constraints. payment_status: 'pending' = awaiting a terminal or gateway
--    result; 'unpaid' and 'failed' both mean not complete and are resolvable by
--    retry or by settling in cash; 'paid' is the only completed state.
alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check
  check (payment_method in ('card', 'cash', 'terminal'));

alter table orders drop constraint if exists orders_payment_status_check;
alter table orders add constraint orders_payment_status_check
  check (payment_status in ('pending', 'paid', 'unpaid', 'failed', 'cancelled'));

-- Widen the status constraint from 0002 to admit orders awaiting payment.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending_payment', 'new', 'preparing', 'ready', 'completed', 'cancelled'));

create unique index if not exists orders_reference_key on orders (reference);
create unique index if not exists orders_public_token_key on orders (public_token);
create unique index if not exists orders_notification_token_key on orders (notification_token);
create unique index if not exists orders_hit_txn_ref_key on orders (hit_txn_ref);
create index if not exists orders_windcave_session_id_idx on orders (windcave_session_id);
create index if not exists orders_payment_status_idx on orders (payment_status);

-- 3. Audit trail — every terminal attempt and every gateway response.
create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  kind text not null,
  raw jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists payment_events_order_id_idx on payment_events (order_id, created_at desc);

alter table payment_events enable row level security;

create policy "payment_events_authenticated_select" on payment_events
  for select using (auth.role() = 'authenticated');

-- 4. Close the anon-insert hole from 0004. Anyone holding the public anon key
--    could forge an order at any total — unacceptable once a card terminal
--    charges against one. All writes now go through the service-role client.
drop policy if exists "orders_anon_insert" on orders;
drop policy if exists "order_items_anon_insert" on order_items;
```

2. Apply the migration (`supabase db push`, or paste into the dashboard SQL editor).

3. Regenerate types: `npm run db:types`. Confirm `types/supabase.ts` carries the new columns and `payment_events`.

4. Verify `npm run build` and `npm run lint` stay green — nothing consumes these columns yet.

5. Confirm in Supabase → Auth → Policies that `orders_anon_insert` is gone, then attempt an insert into `orders` using the **anon** key and confirm it is rejected by policy.

## Todo List
- [ ] `0005_payments.sql` written
- [ ] Migration applied to Supabase
- [ ] `npm run db:types` regenerated; new columns + `payment_events` present
- [ ] `orders_anon_insert` confirmed gone, anon insert rejected
- [ ] `lint` / `build` green

## Success Criteria
1. `orders` carries the identity, payment, HIT, and online columns.
2. `status` accepts `pending_payment`; `payment_method` accepts `card`/`cash`/`terminal`.
3. `payment_events` exists with RLS on and authenticated-only select.
4. The anon key can no longer insert into `orders` or `order_items`.

## Risk Assessment
- **Migration run against a non-empty `orders`** → backfill-then-constrain ordering handles it; check the row count before and after.
- **Constraint name mismatch** — if `0002`'s check was named differently in your project, `drop constraint if exists orders_status_check` silently no-ops and the `add` then fails on conflicting data. Run `\d orders` first and use the real name.
- **`orders_hit_txn_ref_key` is unique** — correct, since a ref identifies one attempt. Nulls do not collide in Postgres unique indexes, so unattempted orders are fine.

## Security Considerations
- The anon-insert drop is as much the point of this phase as the new columns. Do not skip step 5.

## Next Steps
Phase 02 (order creation) and Phase 04 (HIT client) both unblock here and can proceed in parallel.
