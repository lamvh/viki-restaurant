# Viki — Vietnamese Street Food

Standalone marketing + ordering site for **Viki**, a Vietnamese street-food spot in
Glenfield Mall, Auckland. Implements the approved **"1b — Fresh"** visual direction:
homepage plus a complete ordering flow (menu → item modal → cart → checkout →
confirmation) with client-side pricing and loyalty logic.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** — CSS-first config, Viki tokens as CSS variables
- **Fonts:** Instrument Serif (display) + Hanken Grotesk (body) via `next/font/google`
- **State:** Zustand + `persist` (`localStorage`)
- **Testing:** Vitest + React Testing Library + jsdom
- **Lint/format:** ESLint (`next/core-web-vitals`) + Prettier

## Requirements

- **Node.js 20+** (a `.nvmrc` pins the tested version — run `nvm use`)

## Getting started

```bash
nvm use            # or ensure Node 20+ is active
npm install
npm run dev        # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |

## Documentation

Living docs are maintained under [`docs/`](./docs):

- [`project-overview.md`](./docs/project-overview.md) — what Viki is, scope, milestones
- [`system-architecture.md`](./docs/system-architecture.md) — routes, state, component map
- [`codebase-summary.md`](./docs/codebase-summary.md) — directory guide + conventions
- [`features.md`](./docs/features.md) — feature list with status
- [`design-guidelines.md`](./docs/design-guidelines.md) — tokens, typography, the 1b direction
- [`seo-guidelines.md`](./docs/seo-guidelines.md) — SEO meta, Open Graph, JSON-LD conventions
- [`changelog.md`](./docs/changelog.md) — dated record of changes

The design spec lives at
[`docs/superpowers/specs/2026-07-05-viki-nextjs-homepage-and-ordering-flow-design.md`](./docs/superpowers/specs/2026-07-05-viki-nextjs-homepage-and-ordering-flow-design.md).
