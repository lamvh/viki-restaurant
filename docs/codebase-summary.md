# Codebase Summary — Viki

## Directory guide

```
viki-restaurant/
  app/                 # App Router: layout, pages, global styles
    globals.css        # Tailwind v4 import + design tokens
    layout.tsx         # fonts + <body> shell (chrome/overlays added later)
    page.tsx           # Home (placeholder until Phase 03)
  components/          # UI components (added Phases 03–05)
  store/              # Zustand cart store (Phase 02)
  data/               # menu data (Phase 02)
  lib/                # pricing + format helpers (Phase 02)
  types/              # shared TS types (Phase 02)
  docs/               # living documentation
  plans/              # implementation plan + phases
```

## Conventions

- **Filenames:** kebab-case, descriptive.
- **File size:** keep each source file < 200 lines; compose over large components.
- **TypeScript:** strict mode; path alias `@/*` → project root.
- **Imports:** use `@/…` alias for intra-project imports.
- **Styling:** Tailwind utilities backed by CSS-variable tokens; no inline hex — use
  token utilities (`bg-brand`, `text-ink`, etc.).
- **Server vs client:** content sections server-rendered; interactive chrome is
  `'use client'`.

## Status

All 7 phases complete: scaffold + tooling, data/pricing/store core, layout chrome +
homepage, menu + item modal, cart drawer + checkout + confirmation, component tests +
responsive QA, and SEO + structured data. 46 tests pass; lint/build clean. Milestone
(homepage + full ordering flow, "1b Fresh", SEO-ready) done.
