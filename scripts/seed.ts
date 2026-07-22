// One-off seed: menu (data/menu/*) + restaurant settings (data/restaurant.ts)
// + the current signed-in admin's profile role. Run with `npm run db:seed`.
// Safe to re-run — it upserts by slug/id.

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });

import { createClient } from '@supabase/supabase-js';

import { MENU, FEATURED_IDS } from '../data/menu';
import { RESTAURANT } from '../data/restaurant';
import type { Database } from '../types/supabase';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

// Standalone script (not bundled by Next.js), so this builds its own client
// rather than importing lib/supabase/service-client.ts — the `server-only`
// guard there only no-ops under Next's bundler, not plain Node.
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL are not set.');
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function seedSettings(supabase: ReturnType<typeof createServiceClient>) {
  const { error } = await supabase.from('settings').upsert({
    id: SETTINGS_ID,
    name: RESTAURANT.name,
    tagline: RESTAURANT.tagline,
    blurb: RESTAURANT.blurb,
    address: RESTAURANT.address,
    suburb: RESTAURANT.suburb,
    phone: RESTAURANT.phone,
    hours: JSON.parse(JSON.stringify(RESTAURANT.hours)),
    postal: JSON.parse(JSON.stringify(RESTAURANT.postal)),
    opening_hours: JSON.parse(JSON.stringify(RESTAURANT.openingHours)),
  });
  if (error) throw new Error(`seed settings: ${error.message}`);
  console.log('Seeded settings.');
}

async function seedMenu(supabase: ReturnType<typeof createServiceClient>) {
  for (const [categorySort, category] of MENU.entries()) {
    const { data: categoryRow, error: categoryError } = await supabase
      .from('categories')
      .upsert({ slug: category.id, name: category.name, sort: categorySort }, { onConflict: 'slug' })
      .select('id')
      .single();
    if (categoryError || !categoryRow) {
      throw new Error(`seed category ${category.id}: ${categoryError?.message}`);
    }

    for (const [itemSort, item] of category.items.entries()) {
      const { data: itemRow, error: itemError } = await supabase
        .from('menu_items')
        .upsert(
          {
            category_id: categoryRow.id,
            slug: item.id,
            name: item.name,
            description: item.desc,
            price: item.price,
            tags: item.tags ?? [],
            image_url: item.image ?? null,
            is_featured: (FEATURED_IDS as readonly string[]).includes(item.id),
            is_available: true,
            sort: itemSort,
          },
          { onConflict: 'slug' },
        )
        .select('id')
        .single();
      if (itemError || !itemRow) {
        throw new Error(`seed item ${item.id}: ${itemError?.message}`);
      }

      for (const [groupSort, group] of (item.groups ?? []).entries()) {
        const { data: groupRow, error: groupError } = await supabase
          .from('option_groups')
          .insert({
            menu_item_id: itemRow.id,
            title: group.title,
            type: group.type,
            sort: groupSort,
          })
          .select('id')
          .single();
        if (groupError || !groupRow) {
          throw new Error(`seed option group ${group.title}: ${groupError?.message}`);
        }

        const choiceRows = group.choices.map((choice, choiceSort) => ({
          option_group_id: groupRow.id,
          label: choice.label,
          price: choice.price,
          sort: choiceSort,
        }));
        const { error: choiceError } = await supabase.from('option_choices').insert(choiceRows);
        if (choiceError) throw new Error(`seed option choices: ${choiceError.message}`);
      }
    }
  }
  console.log('Seeded menu (categories, items, option groups/choices).');
}

async function main() {
  const supabase = createServiceClient();
  await seedSettings(supabase);
  await seedMenu(supabase);
  console.log(
    'Done. Create the first admin via Supabase Auth (sign up on /admin/login once it exists), ' +
      "then run: update profiles set role = 'admin' where id = '<user-id>';",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
