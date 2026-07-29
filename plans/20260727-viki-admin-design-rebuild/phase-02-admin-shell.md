# Phase 02 — Admin shell

**Priority:** blocking for 3–5
**Status:** planned

## Overview

Replace the current sidebar + topbar with the design's chrome: a dark 236px rail,
a switchable topbar layout, a mobile header + bottom tab bar, and a desktop
title/action bar.

## Behaviour

- **Desktop (≥820px), `sidebar`** — dark rail, 236px. Logo mark, "Manage" group
  (Overview / Counter / Orders / Menu), gold-locked "Admin" group, layout toggle
  and user identity pinned to the bottom.
- **Desktop, `topbar`** — 62px dark header, nav inline, 2px green underline on
  the active item.
- **Mobile (<820px)** — 54px dark header showing the section title, plus a bottom
  tab bar over the four Manage items.
- **Layout preference** persists in `localStorage` (`viki.admin.layout`).
- **Active item** derives from `usePathname()`, matching the existing
  `AdminNavLink` rule (`/admin` exact, others by prefix).
- **Orders badge** — count of `new` orders, passed from the server layout.

## Nav model

Single source of truth so the rail, topbar and tab bar cannot drift:

```
lib/admin/nav-items.ts
  ADMIN_NAV: { key, href, label, iconPath, group: 'manage' | 'admin', soon? }[]
  sectionMetaFor(pathname): { title, sub }
```

Titles and sub-titles come from the design's `titleMap`:

| Route | Title | Sub |
|---|---|---|
| `/admin` | Overview | Today at Glenfield |
| `/admin/pos` | Counter | Take walk-in orders at the till |
| `/admin/orders` | Orders | Live queue and history |
| `/admin/menu` | Menu & products | Prices, availability and dishes |

Admin-group entries (Content, Payments, End of day, Printers) render with the
existing `soon` treatment — visible, disabled, never linking to a 404. They are
only shown when `role === 'admin'`, matching current behaviour.

## Files

- **Create** `lib/admin/nav-items.ts`
- **Create** `components/admin/layout/admin-shell.tsx` (client — holds layout state)
- **Create** `components/admin/layout/admin-rail.tsx`
- **Create** `components/admin/layout/admin-topbar-nav.tsx`
- **Create** `components/admin/layout/admin-mobile-tabs.tsx`
- **Create** `components/admin/layout/admin-title-bar.tsx`
- **Create** `components/admin/layout/nav-icon.tsx` (shared 24×24 stroke icon)
- **Modify** `app/admin/layout.tsx` — read user + new-order count, render the shell
- **Delete** `components/admin/layout/admin-sidebar.tsx`,
  `components/admin/layout/admin-topbar.tsx`,
  `components/admin/layout/admin-nav-link.tsx` (superseded)

## Risks

- The receipt route (`/admin/orders/[orderId]/receipt`) must stay printable —
  keep `no-print` on all new chrome.
- The login page renders inside this segment unauthenticated; the existing
  "return children bare when no user" guard must survive the rewrite.

## Success criteria

- All four sections reachable from rail, topbar and mobile tabs.
- Layout toggle persists across a reload.
- Printing a receipt shows no admin chrome.
