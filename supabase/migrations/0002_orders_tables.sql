-- Orders + frozen line-item snapshots.

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  customer_name text,
  customer_phone text,
  note text,
  subtotal numeric(10, 2) not null,
  total numeric(10, 2) not null,
  status text not null check (status in ('new', 'preparing', 'ready', 'completed', 'cancelled')) default 'new',
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  item_name text not null,
  unit_price numeric(10, 2) not null,
  quantity int not null,
  options jsonb not null default '[]',
  line_total numeric(10, 2) not null
);

create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists order_items_order_id_idx on order_items (order_id);
