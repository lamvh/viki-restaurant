# Phase 06 — Menu Admin + Image Uploads

## Context Links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-22-viki-admin-design.md](../../docs/superpowers/specs/2026-07-22-viki-admin-design.md) (§9 menu, §10 images, §6 roles, §5 schema)
- Depends on: 03 (`lib/db` mutate-menu stubs + `getMenu`), 04 (admin shell)
- Unblocks: 07

## Overview
- **Priority:** P1 (core value: staff-driven live menu)
- **Status:** pending
- **Description:** `/admin/menu` — categories + items list with create/edit/delete for items, an option-group editor, and Supabase Storage image uploads. Admin-only writes; staff read-only. Mutations `revalidatePath` the public menu/home so edits go live.

## Key Insights
- This is the largest phase: CRUD across 4 tables (`categories`, `menu_items`, `option_groups`, `option_choices`) + Storage. Split components aggressively (< 200 lines each).
- Fills the `lib/db/mutate-menu.ts` stubs from Phase 03 — every mutation `requireAdmin()` → service-role write → `revalidatePath('/menu')` + `('/')`.
- Admin menu read must include unavailable items (`is_available=false`) — public `getMenu` filters them out. Use a `getMenuForAdmin()` variant or a flag.
- Image upload (spec §10): server action → validate type (jpeg/png/webp) + size (~5MB) → service-role Storage upload to `dish-images` → public URL → `menu_items.image_url`. Replacing/deleting an image best-effort removes the old object.
- Seed images currently reference `/dishes/*` public paths (Phase 01 decision); first re-upload migrates that item to Storage. No bulk migration needed.
- Option-group editor is nested (group has type single/multi + ordered choices with price deltas) — mirrors `types/menu.ts` `OptionGroup`/`OptionChoice`. Keep the editor a controlled client form; persist via one action that diffs/writes groups+choices.
- Staff read-only (spec §6): render list but hide/disable create/edit/delete; server actions still `requireAdmin()` (never trust UI).

## Requirements
**Functional**
- List categories + their items (incl. unavailable), admin-editable.
- Create/edit/delete item: name, desc, price, tags (GF/DF/VEG/R18), availability, featured, image, option groups.
- Option-group editor: add/remove groups (single/multi), add/remove choices (label + price), reorder via `sort`.
- Image upload with type/size validation; replace removes old object best-effort.
- Category create/edit/delete (minimal — needed to place items).
- Mutations revalidate public `/menu` + `/`.
- Staff: read-only view; admin: full CRUD.

**Non-functional**
- All writes `requireAdmin()` server-side.
- Service-role Storage access server-only.
- Files < 200 lines.

## Architecture
- **Read:** `admin/menu/page.tsx` (server) → `getMenuForAdmin()` → list.
- **Item mutation:** item form (client) → server action in `admin/menu/actions.ts` → `requireAdmin()` → `lib/db/mutate-menu` (service client) → `revalidatePath`.
- **Image:** upload form field → `upload-dish-image` server action → validate → `service-client` Storage `.upload()` → public URL → stored on item.

## Related Code Files
**Create**
- `app/admin/menu/page.tsx` (list)
- `app/admin/menu/new/page.tsx` + `app/admin/menu/[id]/edit/page.tsx` (item form host)
- `app/admin/menu/actions.ts` (create/update/delete item, category, groups; image upload/delete — all `requireAdmin`)
- `components/admin/menu/menu-list.tsx` (categories + items, admin/staff aware)
- `components/admin/menu/menu-item-form.tsx` (`'use client'`)
- `components/admin/menu/tag-selector.tsx` (`'use client'`)
- `components/admin/menu/availability-featured-toggles.tsx` (`'use client'`)
- `components/admin/menu/option-group-editor.tsx` (`'use client'`)
- `components/admin/menu/option-choice-row.tsx` (`'use client'`)
- `components/admin/menu/image-upload-field.tsx` (`'use client'`)
- `components/admin/menu/category-form.tsx` (`'use client'`)
- `lib/db/get-menu-for-admin.ts` (includes unavailable)
- `lib/storage/upload-dish-image.ts` (validation + service-role Storage)
- `lib/validation/menu-item-schema.ts` (input validation)

**Modify**
- `lib/db/mutate-menu.ts` (fill bodies: category/item/group/choice CRUD)
- `next.config.ts` (`images.remotePatterns` add Supabase Storage host)

**Delete:** none

## Implementation Steps
1. `get-menu-for-admin.ts`: like `getMenu` but includes unavailable items + admin-relevant fields; `requireStaff()` (both roles read).
2. `menu-list.tsx`: render categories→items; show create/edit/delete controls only when `role==='admin'` (cosmetic).
3. `lib/validation/menu-item-schema.ts`: validate name (required), price (>=0), tags ⊂ allowed, desc length, etc. Reused by actions.
4. `menu-item-form.tsx`: controlled fields + `tag-selector`, `availability-featured-toggles`, `image-upload-field`, `option-group-editor`. Submits to create/update action.
5. `option-group-editor.tsx` + `option-choice-row.tsx`: manage nested groups/choices with `sort`, type single/multi, price deltas.
6. `upload-dish-image.ts`: `requireAdmin()`; validate MIME ∈ {jpeg,png,webp} + size ≤ ~5MB; `service-client` Storage `.upload(path, file, {upsert})`; return public URL. Provide `deleteDishImage(path)` best-effort.
7. `image-upload-field.tsx`: file input → calls upload action → shows preview/URL; on replace, triggers old-object delete.
8. Fill `mutate-menu.ts`: `createItem/updateItem/deleteItem`, `createCategory/updateCategory/deleteCategory`, group/choice writes. Each `requireAdmin()`, service client, then `revalidatePath('/menu')` + `('/')`.
9. `admin/menu/actions.ts`: thin server actions wrapping `mutate-menu` + validation + upload; return typed results/errors.
10. `category-form.tsx` + minimal category CRUD pages/inline.
11. `next.config.ts`: add Supabase Storage `remotePatterns` host so `next/image` can render uploaded URLs.
12. Manual: as admin, create/edit item with image + options → verify appears on public `/menu` (revalidated); toggle availability → hidden publicly; as staff, controls absent + direct action call blocked.

## Todo List
- [ ] `get-menu-for-admin` (includes unavailable, staff-read)
- [ ] `menu-list` (role-aware controls)
- [ ] `menu-item-schema` validation
- [ ] `menu-item-form` + `tag-selector` + toggles
- [ ] `option-group-editor` + `option-choice-row`
- [ ] `upload-dish-image` (validate + Storage) + `image-upload-field`
- [ ] Fill `mutate-menu` CRUD (all `requireAdmin` + revalidate)
- [ ] `admin/menu/actions.ts` wrappers
- [ ] `category-form` + category CRUD
- [ ] `next.config.ts` Storage remotePatterns
- [ ] Manual admin CRUD + staff read-only + public revalidate checks

## Success Criteria
- Admin creates/edits/deletes items (with tags, availability, featured, options, image); changes appear on public `/menu` + `/` promptly (revalidate).
- Toggling `is_available=false` hides item on public menu, still visible in admin.
- Image upload validates type/size; stored URL renders via `next/image`; replace removes old object.
- Option groups/choices persist and render in the public item modal.
- Staff sees read-only menu; admin-only actions rejected server-side for staff/anon.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Nested option-group write partial failure | Med | Med | Write groups+choices in one action; wrap in rpc/transaction or rollback on error |
| Storage upload bypasses role check | Low | High | `upload-dish-image` calls `requireAdmin()` before service-role upload |
| Malicious file upload (wrong type/oversize) | Med | Med | Server validates MIME + size before upload; bucket public-read only |
| Stale public menu after edit | Med | Med | `revalidatePath('/menu')` + `('/')` on every mutation |
| Orphaned Storage objects on replace/delete | Med | Low | Best-effort delete of old object; acceptable per spec §10 |
| `next/image` blocks Storage host | Low | Low | Add Storage host to `remotePatterns` |
| Deleting category cascades items unexpectedly | Low | Med | FK `on delete cascade` is intended; confirm + warn in delete UI |

## Security Considerations
- Every menu/category/group/choice/image mutation `requireAdmin()` server-side; UI gating cosmetic.
- Service-role Storage access server-only; validate uploads before write.
- Input validation (`menu-item-schema`) on all admin writes.

## Next Steps
- Phase 07 reuses the same guarded-action + service-role pattern for settings + users.
