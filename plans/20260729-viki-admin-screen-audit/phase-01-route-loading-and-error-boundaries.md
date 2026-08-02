# Phase 01 — Route loading, error & not-found boundaries

**Priority:** 🔴 highest · **Status:** not started · **New schema:** none

Every admin route is `dynamic = 'force-dynamic'`. Today a click on Orders, Menu
or a filter pill freezes the current screen until Supabase answers. Nothing in
the repo renders a skeleton, and nothing catches a thrown query.

## Key insights

- `loading.tsx` covers **route entry** only. Orders changes `?status=`/`?service=`/
  `?order=` on the same segment — a keyed `<Suspense>` inside the page is what
  makes those re-suspend. Both are needed; neither replaces the other.
- Next 15.5.20 is installed, so `useLinkStatus()` (15.3+) is available for
  per-link pending affordances on the rail / tabs / filter pills.
- `app/admin/orders/page.tsx` awaits `listOrders()` **then** `getOrderForStaff()`
  sequentially. Splitting the panel into its own Suspense boundary lets the list
  paint while the detail resolves.
- Skeletons must reuse real component geometry (card heights, the 380px panel
  column, the 88px POS tile image) or the paint shifts on arrival.

## Files to create

| File | Renders |
|---|---|
| `app/admin/loading.tsx` | 4 KPI tiles + chart block + dark queue block + top-dishes rows |
| `app/admin/orders/loading.tsx` | filter pills + 4 order-card skeletons + detail-panel block |
| `app/admin/menu/loading.tsx` | category tabs + 6 dish-card skeletons |
| `app/admin/pos/loading.tsx` | full-bleed: cat tabs + tile grid + ticket column |
| `app/admin/orders/[orderId]/receipt/loading.tsx` | 80mm receipt paper block |
| `app/admin/error.tsx` | `'use client'` — admin palette, `reset()`, "Back to Overview" |
| `app/admin/not-found.tsx` | admin-chrome 404 (receipt route already calls `notFound()`) |
| `app/global-error.tsx` | last-resort root boundary |
| `components/admin/ui/skeleton.tsx` | shared shimmer primitive on admin tokens |

## Files to modify

- `app/admin/orders/page.tsx` — extract list + panel into async child components;
  wrap in `<Suspense key={`${status}:${service}:${order}`}>` so filter changes
  re-suspend. Panel gets its own boundary so the list is not blocked by it.
- `components/admin/orders/order-filter-tabs.tsx` — pending affordance via
  `useLinkStatus()` on the active-target pill.
- `app/admin/layout.tsx` — `countNewOrders()` currently blocks the whole shell;
  move the badge into a `<Suspense>` so nav paints immediately.

## Implementation steps

1. Build `Skeleton` on `--color-admin-*` tokens; one `vk-pulse` keyframe (the
   design already defines it) rather than per-file animation classes.
2. Write the five `loading.tsx` files, each mirroring its page's grid exactly.
3. Add `app/admin/error.tsx` — log to console, show a plain sentence, `reset()`
   button, and a link out. No stack traces in the UI.
4. Add `app/admin/not-found.tsx` + `app/global-error.tsx`.
5. Refactor `orders/page.tsx` to the keyed-Suspense shape above.
6. Suspend the nav badge in `app/admin/layout.tsx`.
7. Add `useLinkStatus()` pending styling to filter pills and rail links.

## Todo

- [ ] `components/admin/ui/skeleton.tsx`
- [ ] `app/admin/loading.tsx`
- [ ] `app/admin/orders/loading.tsx`
- [ ] `app/admin/menu/loading.tsx`
- [ ] `app/admin/pos/loading.tsx`
- [ ] `app/admin/orders/[orderId]/receipt/loading.tsx`
- [ ] `app/admin/error.tsx`
- [ ] `app/admin/not-found.tsx`
- [ ] `app/global-error.tsx`
- [ ] Orders keyed-Suspense refactor
- [ ] Nav-badge Suspense in the layout
- [ ] `useLinkStatus()` on filter pills + rail

## Success criteria

- Throttled to Slow 3G, every admin navigation shows a skeleton within one frame.
- Changing an Orders filter re-suspends the list without blanking the chrome.
- A forced Supabase error renders the styled admin error card, not Next's default.
- `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` all clean.

## Risks

| Risk | Mitigation |
|---|---|
| Skeleton geometry drifts from the real cards | Import the same token/size constants; check both 820px and 1120px breakpoints |
| Keyed Suspense remounts the panel on every keystroke-driven nav | Key on the three filter values only, never on a search string |
| `error.tsx` swallows a real bug in dev | `console.error(error)` in the boundary; keep `error.digest` visible |

## Next

Independent of Phases 2–4. Land first — the skeletons in Phase 2's empty-state
work reuse `Skeleton` from here.
