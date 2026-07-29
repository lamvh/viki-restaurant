import { MENU as STATIC_MENU } from '@/data/menu';
import { createServiceClient } from '@/lib/supabase/service-client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { MenuCategory, MenuItem, OptionGroup, Tag } from '@/types/menu';

type ChoiceRow = { id: string; label: string; price: number; sort: number };
type GroupRow = {
  id: string;
  title: string;
  type: 'single' | 'multi';
  sort: number;
  option_choices: ChoiceRow[] | null;
};
type ItemRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  tags: string[] | null;
  image_url: string | null;
  is_featured: boolean;
  is_available: boolean;
  sort: number;
  option_groups: GroupRow[] | null;
};

function toGroup(row: GroupRow): OptionGroup {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    choices: [...(row.option_choices ?? [])]
      .sort((a, b) => a.sort - b.sort)
      .map((c) => ({ id: c.id, label: c.label, price: Number(c.price) })),
  };
}

function toItem(row: ItemRow): MenuItem {
  return {
    // The domain id is the slug, so cart keys and order history stay stable when
    // a row is edited — a UUID would churn on every reseed.
    id: row.slug,
    name: row.name,
    desc: row.description,
    price: Number(row.price),
    tags: (row.tags ?? []) as Tag[],
    image: row.image_url ?? undefined,
    groups: [...(row.option_groups ?? [])].sort((a, b) => a.sort - b.sort).map(toGroup),
  };
}

/**
 * The menu, from the database, falling back to `data/menu/*` when Supabase is
 * unconfigured or empty.
 *
 * The fallback matters: this feeds both the public site and — through
 * `createOrder` — what customers are charged. A transient read failure must
 * degrade to the last known-good prices rather than to an empty menu.
 */
export async function getMenu(): Promise<MenuCategory[]> {
  if (!isSupabaseConfigured()) return STATIC_MENU;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('categories')
      .select(
        'id, slug, name, sort, menu_items(id, slug, name, description, price, tags, image_url, is_featured, is_available, sort, option_groups(id, title, type, sort, option_choices(id, label, price, sort)))',
      )
      .order('sort', { ascending: true });

    if (error || !data || data.length === 0) return STATIC_MENU;

    const categories = data
      .map((row) => ({
        id: row.slug,
        name: row.name,
        sort: row.sort,
        items: ((row.menu_items ?? []) as ItemRow[])
          // Unavailable dishes leave the menu but stay in the table, so past
          // orders keep resolving.
          .filter((item) => item.is_available)
          .sort((a, b) => a.sort - b.sort)
          .map(toItem),
      }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ id, name, items }) => ({ id, name, items }));

    return categories.some((c) => c.items.length > 0) ? categories : STATIC_MENU;
  } catch (cause) {
    console.error('Menu read failed; serving the static fallback', cause);
    return STATIC_MENU;
  }
}

/** Flattened lookup for repricing an order line. */
export async function getMenuItems(): Promise<MenuItem[]> {
  return (await getMenu()).flatMap((category) => category.items);
}

/** Featured dishes for the homepage, in menu order. */
export async function getFeaturedItems(limit = 3): Promise<MenuItem[]> {
  const supabase = isSupabaseConfigured() ? createServiceClient() : null;
  if (!supabase) return STATIC_MENU.flatMap((c) => c.items).slice(0, limit);

  const { data } = await supabase
    .from('menu_items')
    .select('slug')
    .eq('is_featured', true)
    .eq('is_available', true)
    .order('sort', { ascending: true })
    .limit(limit);

  const slugs = new Set((data ?? []).map((r) => r.slug));
  const items = await getMenuItems();
  const featured = items.filter((item) => slugs.has(item.id));

  return featured.length > 0 ? featured : items.slice(0, limit);
}
