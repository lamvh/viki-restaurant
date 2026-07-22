-- Core menu tables: categories, menu items, option groups, option choices.
-- pgcrypto's gen_random_uuid() is enabled by default on Supabase projects.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  sort int not null default 0
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete cascade,
  slug text unique not null,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null,
  tags text[] not null default '{}',
  image_url text,
  is_featured boolean not null default false,
  is_available boolean not null default true,
  sort int not null default 0
);

create table if not exists option_groups (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items (id) on delete cascade,
  title text not null,
  type text not null check (type in ('single', 'multi')),
  sort int not null default 0
);

create table if not exists option_choices (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references option_groups (id) on delete cascade,
  label text not null,
  price numeric(10, 2) not null default 0,
  sort int not null default 0
);

create index if not exists menu_items_category_id_idx on menu_items (category_id);
create index if not exists option_groups_menu_item_id_idx on option_groups (menu_item_id);
create index if not exists option_choices_option_group_id_idx on option_choices (option_group_id);
