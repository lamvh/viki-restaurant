# Phase 01 — Admin design tokens + status metadata

**Priority:** blocking (every later phase consumes these)
**Status:** planned

## Overview

The design ships a warm cream/brown palette that the public site does not use.
Add it as a *separate, explicitly named* token set so nothing about the customer
-facing pages changes.

## Tokens (from the design source)

| Token | Value | Role |
|---|---|---|
| `--color-admin-bg` | `#F5EDE0` | page background |
| `--color-admin-card` | `#FBF6EC` | card / panel surface |
| `--color-admin-ink` | `#26201A` | primary text, dark chrome (rail, topbar) |
| `--color-admin-muted` | `#6E6355` | secondary text |
| `--color-admin-faint` | `#9a8f7d` | tertiary text, placeholders |
| `--color-admin-well` | `#EFE6D6` | inset tracks, segmented-control background |
| `--color-admin-panel` | `#ECE6DC` | neutral pill background |
| `--color-admin-red` | `#B23A2C` | badges, destructive, "today" chart bar |
| `--color-admin-gold` | `#E0A24A` | Admin-group marker |
| `--color-admin-line` | `rgba(38,32,26,.1)` | hairline borders |
| `--color-admin-line-strong` | `rgba(38,32,26,.18)` | button borders |
| `--color-admin-rail-dim` | `#a89c8a` | inactive rail label |
| `--color-admin-rail-faint` | `#8a7f6e` | rail meta text |

`--color-brand` (`#2F6B4F`) already matches the design's green — reuse it.

## Status metadata

The design assigns each kitchen status a pill background, foreground and dot
colour. Model it once, in code, next to the existing status vocabulary:

| Status | bg | fg | dot |
|---|---|---|---|
| `new` | `#F7E3DF` | `#B23A2C` | `#B23A2C` |
| `preparing` | `#F5EAD3` | `#8A6314` | `#B8862F` |
| `ready` | `#DFF0E6` | `#256045` | `#2F6B4F` |
| `completed` | `#ECE6DC` | `#6E6355` | `#9a8f7d` |
| `cancelled` | `#ECE6DC` | `#6E6355` | `#9a8f7d` |
| `pending_payment` | `#F5EAD3` | `#8A6314` | `#B8862F` |

The design has no `pending_payment` or `cancelled` state (its mock never
produces one). Both exist in the real schema, so both need a mapping — they
reuse the closest design pair rather than inventing a new colour.

## Files

- **Modify** `app/globals.css` — add the `--color-admin-*` block to `@theme`.
- **Create** `lib/admin/status-meta.ts` — `STATUS_META` keyed by `OrderStatus`,
  plus `SERVICE_META` for the pickup/delivery pills.
- **Modify** `docs/design-guidelines.md` — document the admin token set.

## Success criteria

- `bg-admin-card`, `text-admin-muted` etc. resolve as Tailwind utilities.
- No existing token value changes; `git diff` on public components is empty.
- `STATUS_META` is total over `OrderStatus` (TypeScript `Record`, no fallback).
