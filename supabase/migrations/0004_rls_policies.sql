-- RLS: public can read the menu/settings; only staff/admin (authenticated,
-- checked server-side) can read orders; nobody writes via anon except order
-- inserts from checkout. All privileged writes go through the service-role
-- client after a server-side profiles.role check (see lib/auth, lib/db).

alter table categories enable row level security;
alter table menu_items enable row level security;
alter table option_groups enable row level security;
alter table option_choices enable row level security;
alter table profiles enable row level security;
alter table settings enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Menu + settings: public read.
create policy "categories_public_select" on categories for select using (true);
create policy "menu_items_public_select" on menu_items for select using (true);
create policy "option_groups_public_select" on option_groups for select using (true);
create policy "option_choices_public_select" on option_choices for select using (true);
create policy "settings_public_select" on settings for select using (true);

-- Profiles: a user can read their own row; authenticated staff/admin can read all
-- (role checks for mutations happen server-side, not via RLS).
create policy "profiles_self_select" on profiles for select using (auth.uid() = id);
create policy "profiles_authenticated_select" on profiles for select using (auth.role() = 'authenticated');

-- Orders: anon can insert (checkout persists the order); only authenticated
-- staff/admin can read or update.
create policy "orders_anon_insert" on orders for insert with check (true);
create policy "orders_authenticated_select" on orders for select using (auth.role() = 'authenticated');
create policy "orders_authenticated_update" on orders for update using (auth.role() = 'authenticated');

create policy "order_items_anon_insert" on order_items for insert with check (true);
create policy "order_items_authenticated_select" on order_items for select using (auth.role() = 'authenticated');

-- No anon/authenticated write policies on categories/menu_items/option_groups/
-- option_choices/settings — those mutations only ever go through the
-- service-role client (lib/supabase/service-client.ts) behind a server-side
-- admin-role check, which bypasses RLS entirely.
