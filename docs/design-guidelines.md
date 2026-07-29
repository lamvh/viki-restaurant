# Design Guidelines — Viki ("1b — Fresh")

The **1b — Fresh** direction: white, airy grid, herb-green accent, product-forward.

## Color tokens

| Token | Value | Use |
|---|---|---|
| `--color-brand` | `#2F6B4F` | Primary CTA / accent (herb green) |
| `--color-ink` | `#141414` | Text, secondary buttons |
| `--color-muted` | `#767676` | Muted text |
| `--color-subtle` | `#5a5a5a` | Subtle text |
| `--color-line` | `#ececec` | Borders |
| `--color-line-strong` | `#e2e2e2` | Stronger borders |
| `--color-surface` | `#ffffff` | Page/surface background |
| `--color-surface-alt` | `#fafafa` | Alt surface |

Tokens are defined in `app/globals.css` under `@theme` (Tailwind v4 CSS-first config),
so they are available both as utilities (`bg-brand`, `text-ink`) and raw CSS variables.

### Admin palette

The manager UI follows the **Viki Admin** design, which uses a warm cream/brown
scheme rather than the site's white one. These are a **separate, prefixed token
set** — not an override — so restyling the admin can never leak into the
marketing or ordering pages. `--color-brand` is shared: both designs use the
same green.

| Token | Value | Use |
|---|---|---|
| `--color-admin-bg` | `#F5EDE0` | Admin page background |
| `--color-admin-card` | `#FBF6EC` | Card / panel surface |
| `--color-admin-ink` | `#26201A` | Primary text; the dark rail and topbar |
| `--color-admin-muted` | `#6E6355` | Secondary text |
| `--color-admin-faint` | `#9a8f7d` | Tertiary text, placeholders |
| `--color-admin-well` | `#EFE6D6` | Inset tracks, segmented controls |
| `--color-admin-panel` | `#ECE6DC` | Neutral pill background |
| `--color-admin-red` | `#B23A2C` | Badges, destructive actions, "today" bar |
| `--color-admin-gold` | `#E0A24A` | Admin-only nav group marker |
| `--color-admin-line` | `rgb(38 32 26 / .1)` | Hairline borders |
| `--color-admin-line-strong` | `rgb(38 32 26 / .18)` | Button borders |
| `--color-admin-rail-dim` / `-faint` / `-bright` | `#a89c8a` / `#8a7f6e` / `#c9bda8` | Text *on* the dark chrome |

Status and service badge palettes are data, not layout — they are picked at
runtime from a row's status — so they live in `lib/admin/status-meta.ts` and are
applied inline rather than as utility classes.

The admin breakpoint is **820px** (the design's own), expressed as Tailwind
arbitrary variants (`min-[820px]:`). Which chrome shows is decided in CSS, never
by measuring `window.innerWidth`, so markup is identical across hydration.

## Typography

- **Display:** Instrument Serif (`--font-display`) — headings `h1`–`h3`.
- **Body:** Hanken Grotesk (`--font-body`).
- Loaded via `next/font/google` and exposed as CSS variables on `<html>`.

## Radii

| Token | Value | Use |
|---|---|---|
| `--radius-card` | 16px | Cards |
| `--radius-btn` | 10px | Buttons |
| `--radius-pill` | 999px | Pills / chips |

## Imagery

`<ImageSlot>` (Phase 03) renders a real image when a `src` is provided (foodhub URLs),
otherwise a styled placeholder box. External hosts allowed via `next.config.ts`
`remotePatterns` (`assets.foodhub.com`).

## Responsive

Layouts are **mobile-first**; breakpoints layer richer layouts on top:

- Base (mobile): single-column stacks; hero, story, and location sections collapse to
  one column; item modal is a bottom sheet; cart drawer is full-width.
- `sm` (≥640px): service toggle appears in header; dish grid → 2 columns.
- `md` (≥768px): hero/story/location → 2 columns; checkout → form + sticky summary;
  item modal centers as a dialog.
- `lg` (≥1024px): popular-dishes grid → 3 columns.
- Content width capped at `max-w-6xl` (chrome/home) / `max-w-4xl`–`max-w-5xl`
  (menu/checkout); horizontal scroll avoided (category chips scroll within their bar).

Overlays lock body scroll while open and trap focus. Recommended QA: a manual pass on
real devices / responsive mode across the flow before launch.

## Tailwind version note

Using Tailwind **v4** (`@tailwindcss/postcss`, CSS-first). If v4 is ever blocked, fall
back to v3 config-based setup and note it here + in the changelog.
