import { requireStaff } from '@/lib/auth/require-role';
import { createServiceClient } from '@/lib/supabase/service-client';

export type AdminMenuItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  isFeatured: boolean;
  sort: number;
  tags: string[];
  imageUrl: string | null;
  /** Category this dish currently sits in — the edit dialog can move it. */
  categoryId: string;
  categoryName: string;
  /** Units sold today, for the card's "· 12 sold today" line. */
  soldToday: number;
};

export type AdminMenuCategory = {
  id: string;
  slug: string;
  name: string;
  sort: number;
  items: AdminMenuItem[];
};

/** Local midnight — "today" follows the restaurant's clock, not UTC. */
function startOfToday(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

/**
 * Units sold today, keyed by the dish name frozen onto the order line.
 *
 * Line items store a name snapshot rather than a menu id, so this joins on name.
 * That is the same key the dashboard's top-sellers list uses, and it means a
 * renamed dish starts a fresh count — which is right: after a rename, the old
 * name is a different product as far as history is concerned.
 */
async function soldTodayByName(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<Map<string, number>> {
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .gte('created_at', startOfToday())
    .neq('status', 'cancelled')
    .neq('status', 'pending_payment');

  const ids = (orders ?? []).map((o) => o.id);
  if (ids.length === 0) return new Map();

  const { data: items } = await supabase
    .from('order_items')
    .select('item_name, quantity')
    .in('order_id', ids);

  const counts = new Map<string, number>();
  for (const row of items ?? []) {
    counts.set(row.item_name, (counts.get(row.item_name) ?? 0) + Number(row.quantity));
  }
  return counts;
}

/**
 * The menu as rows, keyed by database id.
 *
 * Distinct from `getMenu()`, which returns the *domain* shape keyed by slug and
 * hides unavailable dishes. Editing needs the real ids and the hidden rows.
 */
export async function listMenuForAdmin(): Promise<AdminMenuCategory[]> {
  await requireStaff();

  // Service role: the admin password login is not a Supabase Auth session, so an
  // RLS-bound read would return nothing. Authorisation is enforced above.
  const supabase = createServiceClient();

  const [{ data, error }, sold] = await Promise.all([
    supabase
      .from('categories')
      .select(
        'id, slug, name, sort, menu_items(id, slug, name, description, price, is_available, is_featured, sort, tags, image_url)',
      )
      .order('sort', { ascending: true }),
    soldTodayByName(supabase),
  ]);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    sort: row.sort,
    items: (row.menu_items ?? [])
      .map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        isAvailable: item.is_available,
        isFeatured: item.is_featured,
        sort: item.sort,
        tags: (item.tags ?? []) as string[],
        imageUrl: item.image_url,
        categoryId: row.id,
        categoryName: row.name,
        soldToday: sold.get(item.name) ?? 0,
      }))
      .sort((a, b) => a.sort - b.sort),
  }));
}
