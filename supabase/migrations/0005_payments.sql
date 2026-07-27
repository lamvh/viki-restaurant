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

drop policy if exists "payment_events_authenticated_select" on payment_events;
create policy "payment_events_authenticated_select" on payment_events
  for select using (auth.role() = 'authenticated');

-- 4. Close the anon-insert hole from 0004. Anyone holding the public anon key
--    could forge an order at any total — unacceptable once a card terminal
--    charges against one. All writes now go through the service-role client.
drop policy if exists "orders_anon_insert" on orders;
drop policy if exists "order_items_anon_insert" on order_items;
