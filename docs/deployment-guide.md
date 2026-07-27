# Deployment Guide

## Supabase setup (admin dashboard backend)

The admin dashboard (`/admin`) is backed by Supabase (Postgres + Auth + Storage). The
public marketing/menu pages fall back to the static data in `data/` when Supabase env
vars are unset, so the site keeps working without a Supabase project connected.

### 1. Create a project

Create a project at [supabase.com](https://supabase.com) (or reuse an existing one).

### 2. Set environment variables

Copy the three Supabase values from **Project Settings → API** into `.env.local`
(git-ignored — never commit real values):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It bypasses Row Level Security and must
never be exposed to the client — `lib/supabase/service-client.ts` guards this with the
`server-only` package, which fails the build if the module is ever imported into a
client bundle.

Add the same three variables to your hosting provider's environment settings for
preview/production deployments.

### 3. Apply migrations

Migrations live in `supabase/migrations/`, applied in filename order:

- `0001_core_menu_tables.sql` — categories, menu_items, option_groups, option_choices
- `0002_orders_tables.sql` — orders, order_items
- `0003_profiles_and_settings.sql` — profiles (+ new-user trigger), single-row settings
- `0004_rls_policies.sql` — enables RLS and every policy

Using the Supabase CLI:

```bash
npx supabase login          # opens a browser; use --token <access-token> in non-TTY shells
npx supabase link --project-ref <your-project-ref>
npx supabase db push --linked
```

Or paste the SQL files into the Supabase Dashboard's SQL Editor, in order.

### 4. Generate types

```bash
npm run db:types
```

Writes `types/supabase.ts` from the live schema. Re-run after any migration change.

### 5. Seed the menu + settings

```bash
npm run db:seed
```

Upserts categories/items/option groups/choices from `data/menu/*` and restaurant
details from `data/restaurant.ts` into Supabase. Safe to re-run.

Dish photos are seeded as `image_url` pointing at the existing `/dishes/*.jpg` public
paths (no Storage upload needed for the current catalog). Uploading a new image via
the admin menu form (Phase 6) moves that item's photo into the `dish-images` Storage
bucket.

### 6. Create the first admin user

There's no self-serve signup UI (staff-only, invite-driven from Phase 7). Create the
first admin from the Supabase Dashboard: **Authentication → Users → Add user** (set
email + password, confirm email). The `on_auth_user_created` trigger creates a matching
`profiles` row defaulting to `role = 'staff'`. Promote it in the SQL Editor:

```sql
update profiles set role = 'admin' where id = '<user-id-from-auth.users>';
```

Every subsequent staff account is created the same way and promoted (or left as
`staff`) via `/admin/users` (Phase 7) once at least one admin exists.

### 7. Storage bucket

Create a public-read bucket named `dish-images` (Storage → New bucket → Public).
Phase 6 uploads new dish photos here via a server action using the service-role
client; type is restricted to jpeg/png/webp, max ~5 MB.

## Payment — terminal (Windcave HIT)

Full account details, verified protocol facts and the credential map live in
[`windcave-integration.md`](./windcave-integration.md). Manual test script:
[`terminal-payment-uat-runbook.md`](./terminal-payment-uat-runbook.md).

### Environment variables

```
WINDCAVE_HIT_URL=https://uat.windcave.com/hit/pos.aspx
WINDCAVE_HIT_USER=VinapageUAT_HIT
WINDCAVE_HIT_KEY=            # server-only, never NEXT_PUBLIC_
WINDCAVE_HIT_STATION=3425240086
WINDCAVE_HIT_POS_NAME=Viki
WINDCAVE_HIT_POS_VERSION=1.0
WINDCAVE_HIT_VENDOR_ID=Viki  # required by the service; Windcave assigns the real one
WINDCAVE_CURRENCY=NZD
```

### Admin sign-in

The admin panel accepts a password login that needs no Supabase user. It is
**disabled in production unless `ADMIN_LOGIN_PASSWORD` is set**, so a deployment
can never ship with the `admin`/`admin` development default.

```
ADMIN_LOGIN_USER=admin
ADMIN_LOGIN_PASSWORD=        # required in production; use a strong value
ADMIN_SESSION_SECRET=        # HMAC key; falls back to SUPABASE_SERVICE_ROLE_KEY
```

Generate a secret with `openssl rand -base64 32`.

### Terminal network requirement

The reader talks to Windcave over **TCP port 65** (`uatscr.windcave.com` for UAT,
`scr.windcave.com` for production). If that port is blocked the terminal never
comes online, and the symptom is indistinguishable from a broken integration —
check connectivity on the device before debugging the app.

### Migrations

`0005_payments.sql` adds order identity tokens, payment state, terminal and
gateway columns, and the `payment_events` audit table. It also **drops the
`orders_anon_insert` RLS policy**, which allowed anyone holding the public anon
key to forge an order at any total.

### Before production

**Windcave requires POS certification for the card-present channel.** It is an
external turnaround and gates go-live regardless of how finished the code is.
Book it early. The online channel needs a separate eCom certification.
