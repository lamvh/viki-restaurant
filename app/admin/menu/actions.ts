'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin, requireStaff } from '@/lib/auth/require-role';
import { parseMenuPrice, sanitiseTags, toSlug } from '@/lib/orders/menu-validation';
import { createServiceClient } from '@/lib/supabase/service-client';

import type { MenuActionResult } from './menu-action-result';

/**
 * Menu edits change what customers are charged, so every path here revalidates
 * the public surfaces — otherwise a price change would sit in the database while
 * the site kept serving the cached old one.
 */
function revalidatePublic() {
  revalidatePath('/menu');
  revalidatePath('/');
  revalidatePath('/admin/menu');
  revalidatePath('/admin/pos');
}

export async function updateMenuItem(
  itemId: string,
  fields: {
    name: string;
    description: string;
    price: string;
    /** Omit to leave the dish where it is; pass an id to move it. */
    categoryId?: string;
    /** Omit to leave dietary tags untouched. */
    tags?: string[];
  },
): Promise<MenuActionResult> {
  await requireStaff();

  const name = fields.name.trim();
  if (!name) return { ok: false, error: 'Name is required.' };

  const price = parseMenuPrice(fields.price);
  if (!price.ok) return { ok: false, error: price.error };

  const tags = fields.tags ? sanitiseTags(fields.tags) : undefined;
  if (fields.tags && tags === null) return { ok: false, error: 'Unrecognised dietary tag.' };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('menu_items')
    // The slug is deliberately not updated: it is the id used in cart lines and
    // order history, so renaming a dish must not orphan past orders.
    .update({
      name,
      description: fields.description.trim(),
      price: price.value,
      ...(fields.categoryId ? { category_id: fields.categoryId } : {}),
      ...(tags ? { tags } : {}),
    })
    .eq('id', itemId);

  if (error) return { ok: false, error: 'Could not save the dish.' };

  revalidatePublic();
  return { ok: true };
}

export async function setItemFlag(
  itemId: string,
  flag: 'is_available' | 'is_featured',
  value: boolean,
): Promise<MenuActionResult> {
  await requireStaff();

  const supabase = createServiceClient();
  // Written as an explicit branch rather than a computed key: the generated
  // Supabase types reject an index signature, and this keeps the column names
  // literal and greppable.
  const patch = flag === 'is_available' ? { is_available: value } : { is_featured: value };
  const { error } = await supabase.from('menu_items').update(patch).eq('id', itemId);

  if (error) return { ok: false, error: 'Could not update the dish.' };

  revalidatePublic();
  return { ok: true };
}

export async function createMenuItem(
  categoryId: string,
  fields: {
    name: string;
    price: string;
    description?: string;
    tags?: string[];
    /** Defaults to available — the usual reason to add a dish is to sell it. */
    isAvailable?: boolean;
  },
): Promise<MenuActionResult> {
  await requireStaff();

  const name = fields.name.trim();
  if (!name) return { ok: false, error: 'Name is required.' };

  const price = parseMenuPrice(fields.price);
  if (!price.ok) return { ok: false, error: price.error };

  const slug = toSlug(name);
  if (!slug) return { ok: false, error: 'Name must contain letters or numbers.' };

  const tags = sanitiseTags(fields.tags ?? []);
  if (tags === null) return { ok: false, error: 'Unrecognised dietary tag.' };

  const supabase = createServiceClient();
  const { error } = await supabase.from('menu_items').insert({
    category_id: categoryId,
    slug,
    name,
    description: fields.description?.trim() ?? '',
    price: price.value,
    tags,
    is_available: fields.isAvailable ?? true,
    sort: 999,
  });

  if (error) {
    // The slug is unique — a duplicate name is the likely cause, and saying so
    // is more useful than surfacing a constraint name.
    return { ok: false, error: 'Could not add the dish. Is the name already used?' };
  }

  revalidatePublic();
  return { ok: true };
}

/**
 * Admin-only. Deleting removes the dish from history-facing lookups, so
 * hiding via `is_available` is almost always the better move — the UI says so.
 */
export async function deleteMenuItem(itemId: string): Promise<MenuActionResult> {
  await requireAdmin();

  const supabase = createServiceClient();
  const { error } = await supabase.from('menu_items').delete().eq('id', itemId);

  if (error) return { ok: false, error: 'Could not delete the dish.' };

  revalidatePublic();
  return { ok: true };
}
