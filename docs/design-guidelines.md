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

## Tailwind version note

Using Tailwind **v4** (`@tailwindcss/postcss`, CSS-first). If v4 is ever blocked, fall
back to v3 config-based setup and note it here + in the changelog.
