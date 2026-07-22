-- Staff profiles (1:1 with auth.users) + single-row restaurant settings.

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  role text not null check (role in ('admin', 'staff')) default 'staff',
  created_at timestamptz not null default now()
);

-- New auth users get a profile row automatically, defaulting to 'staff'.
-- Promote to 'admin' manually (see docs/deployment-guide.md).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Single-row table: fixed id enforced by the check constraint below.
create table if not exists settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  name text not null,
  tagline text not null default '',
  blurb text not null default '',
  address text not null default '',
  suburb text not null default '',
  phone text not null default '',
  hours jsonb not null default '[]',
  postal jsonb not null default '{}',
  opening_hours jsonb not null default '[]',
  constraint settings_single_row check (id = '00000000-0000-0000-0000-000000000001')
);
