# Phase 04 — Menu section completion (Categories + Homepage tabs)

**Priority:** 🟡 · **Status:** not started · **New schema:** none required

The design's Menu section has **three** sub-tabs (design lines 443–571). Only
one is built.

| Design sub-tab | Design lines | Built |
|---|---|---|
| Dishes | 543–569 | ✅ `menu-screen.tsx` |
| Categories | 455–481 | ❌ |
| Homepage menu | 483–541 | ❌ |

Also missing from the title bar: the design's publish button
(`menuPublishLabel` / `menuPublishStyle`, line 452) that turns active when the
menu is dirty.

## Why this is cheap

Everything needed is already in the schema — this is UI over existing columns:

| Design field | Column | Status |
|---|---|---|
| Category order (▲/▼) | `categories.sort` | ✅ exists |
| Category rename | `categories.name` | ✅ exists |
| Featured on homepage | `menu_items.is_featured` | ✅ exists, `setItemFlag` already writes it |
| Category blurb | — | ❌ needs `categories.blurb text not null default ''` |
| Category web-visible toggle | — | ❌ needs `categories.is_web_visible boolean not null default true` |

Two nullable-safe additive columns; no data migration, no backfill.

## Related code

**Create**
- `components/admin/menu/menu-tabs.tsx` — Dishes / Categories / Homepage
- `components/admin/menu/category-rows.tsx` — reorder + rename + blurb + toggles
- `components/admin/menu/homepage-menu-panel.tsx` — featured picker + live preview
- `app/admin/menu/category-actions.ts` — `renameCategory`, `moveCategory`,
  `setCategoryFlag`, `setCategoryBlurb`
- `supabase/migrations/0008_category_blurb_and_web_visibility.sql`

**Modify**
- `components/admin/menu/menu-screen.tsx` — host the three tabs
- `lib/db/list-menu-admin.ts` — return the two new columns
- `lib/db/get-menu.ts` — respect `is_web_visible` on the public menu
- `lib/admin/nav-items.ts` — section sub-title copy

## Key insights

- Reorder is a **swap of two `sort` values**, not a renumber — concurrent edits
  from two tills then cannot silently reshuffle the whole list.
- `is_web_visible` changes what customers see. `get-menu.ts` feeds the public
  menu, the homepage **and** `createOrder` pricing — hiding a category must not
  make an in-flight cart unpriceable. Filter for display only; keep pricing
  lookups able to resolve a hidden item.
- The design's "live preview" pane is a static render of the same category+dish
  data already on the page — no second query, no iframe.
- Keep the tab in the URL (`?tab=categories`), not component state, so the
  publish button and a reload land on the same view.

## Implementation steps

1. Migration `0008` — two additive columns.
2. Extend `list-menu-admin.ts` + its types.
3. `menu-tabs.tsx`; move the current grid behind the Dishes tab.
4. Categories tab — rename/blurb inputs (debounced save), ▲/▼ swap, two toggles,
   dish-count per row.
5. Homepage tab — featured cards with Remove, "tap to feature" chips over all
   dishes, and the preview column.
6. Publish button in the title bar; enabled only while dirty.
7. Public-menu guard: `get-menu.ts` hides non-visible categories from listings
   while `createOrder` can still resolve their items.
8. Tests: sort-swap helper, and a `get-menu` case proving a hidden category is
   absent from the public list but still priceable.

## Todo

- [ ] Migration `0008`
- [ ] `list-menu-admin.ts` + types
- [ ] `menu-tabs.tsx` + `?tab=` routing
- [ ] `category-rows.tsx` + `category-actions.ts`
- [ ] `homepage-menu-panel.tsx`
- [ ] Publish button
- [ ] `get-menu.ts` visibility guard
- [ ] Tests (sort swap, hidden-category pricing)

## Success criteria

- All three design sub-tabs render and persist.
- Reordering categories in the admin changes the public menu order.
- Hiding a category removes it from the public menu **without** breaking pricing
  for an order that already contains one of its dishes.
- Featured toggles drive the homepage grid.
- Lint, types, tests, build clean.

## Risks

| Risk | Mitigation |
|---|---|
| Hiding a category breaks `createOrder` for a cart already holding its dish | Display-filter only; pricing resolves by id regardless of visibility — cover with a test |
| Debounced rename fires per keystroke | Debounce ≥500ms, save on blur, single in-flight request per row |
| Category delete implied but not designed | Out of scope — no delete affordance this phase (a category with dishes cannot be safely removed) |

## Security

`category-actions.ts` calls `requireStaff()` like `menu/actions.ts`; delete-class
operations stay `requireAdmin()`. RLS on `categories` is unchanged — writes go
through the service client in server actions only.

## Next

Depends on nothing. Ships the last designed section that needs no new milestone.
