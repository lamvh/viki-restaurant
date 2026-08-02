# Phase 03 — Pending feedback, toast & mobile order overlay

**Priority:** 🟠 · **Status:** not started · **New schema:** none

Two gaps: mutation feedback is inconsistent across the admin, and the design's
mobile order-detail overlay was never built.

## Audit — pending / success feedback per mutation

| Action | File | Pending | Success | Verdict |
|---|---|---|---|---|
| Advance order status | `orders/order-actions.tsx` | "Working…" | list refresh | ⚠️ no confirmation |
| Charge to terminal | `orders/order-actions.tsx` | dialog opens | dialog outcome | ✅ |
| Mark paid cash | `orders/order-actions.tsx` | `disabled` only | silent | ❌ no feedback at all |
| Cancel order | `orders/order-actions.tsx` | `disabled` only | silent | ❌ **destructive, no confirm** |
| Toggle availability | `menu/menu-item-card.tsx` | optimistic + revert | silent | ✅ good pattern |
| Save / delete dish | `menu/menu-item-dialog.tsx` | "Saving…" | dialog closes | ⚠️ delete has no confirm |
| Create counter order | `pos/pos-screen.tsx` | "Working…" | green banner | ✅ |
| Fetch card receipt | `orders/fetch-card-receipt-button.tsx` | label swap | inline | ✅ |
| Sign in | `auth/password-login-form.tsx` | "Signing in…" | redirect | ✅ |
| Sign out | `auth/sign-out-button.tsx` | none | redirect | ⚠️ |

Design has a toast (`vk-toast` keyframe, bottom-centre pill, green dot) driving
confirmation for all of these. Nothing in the codebase renders one.

## Files to create

- `components/admin/ui/toast.tsx` + `toast-provider.tsx` — context + viewport,
  the design's pill (`#26201A` bg, green dot, `vk-toast` animation, auto-dismiss
  ~3s, `role="status"` / `aria-live="polite"`).
- `components/admin/ui/confirm-dialog.tsx` — destructive-action confirm, reusing
  `lib/use-focus-trap.ts`.
- `components/admin/orders/order-detail-overlay.tsx` — full-screen mobile sheet
  per design lines 1021–1047: dark 54px header with back button + reference +
  status pill, tinted service block, items, total, sticky advance button.

## Files to modify

- `components/admin/layout/admin-shell.tsx` — mount `ToastProvider` + viewport.
- `components/admin/orders/order-actions.tsx` — toast on advance / cash-settle;
  route Cancel through `ConfirmDialog`.
- `components/admin/menu/menu-item-dialog.tsx` — toast on save; `ConfirmDialog`
  on delete.
- `components/admin/menu/menu-item-card.tsx` — toast on availability flip.
- `components/admin/auth/sign-out-button.tsx` — pending label.
- `app/admin/orders/page.tsx` — below 1120px, `?order=` opens the overlay
  instead of stacking the panel under the list.

## Key insights

- The overlay must stay a **URL state** (`?order=`), not component state — that
  is what keeps the view shareable and makes the browser back button close it,
  matching how selection already works.
- Toasts fire from client components after a server action resolves. They are
  presentation only; the server action result stays the source of truth, and a
  failed action must still render its inline `role="alert"` message — a toast is
  not a substitute for an error the user has to act on.
- Cancel and Delete are the only irreversible actions in the admin. Both are one
  unguarded tap today.

## Implementation steps

1. Toast context + viewport; wire into `AdminShell`.
2. `ConfirmDialog` with focus trap and Escape-to-dismiss.
3. Retrofit the six mutation sites in the table above.
4. Build `OrderDetailOverlay`; render it under `min-[1120px]:hidden`, keep the
   existing sticky panel above that breakpoint.
5. Component test: overlay opens from `?order=`, back button closes it.

## Todo

- [ ] `components/admin/ui/toast.tsx` + provider
- [ ] `components/admin/ui/confirm-dialog.tsx`
- [ ] Mount provider in `admin-shell.tsx`
- [ ] Toasts: advance, cash-settle, availability, dish save
- [ ] Confirm: cancel order, delete dish
- [ ] Sign-out pending state
- [ ] `order-detail-overlay.tsx` + wire into the orders page
- [ ] Overlay test

## Success criteria

- Every mutation ends in a visible outcome — toast, inline error, or navigation.
- Cancel and Delete both require a second, explicit confirmation.
- On a 390px viewport, tapping an order opens the full-screen overlay; back closes it.
- Toast is announced to screen readers and never traps focus.
- Lint, types, tests, build clean.

## Risks

| Risk | Mitigation |
|---|---|
| Toast becomes a dumping ground and hides real errors | Toasts confirm success only; failures stay inline and blocking |
| Overlay + sticky panel both mount, doubling queries | One server-rendered detail, two presentations — CSS decides which shows |
| Confirm dialog adds friction to a busy till | Only the two irreversible actions; status advance stays one tap |

## Next

Independent of Phases 1, 2 and 4.
