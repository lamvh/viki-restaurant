# Phase 01 — Project Scaffold & Tooling

## Context links
- Parent plan: [plan.md](./plan.md)
- Design spec: [2026-07-05-viki-nextjs-homepage-and-ordering-flow-design.md](../../docs/superpowers/specs/2026-07-05-viki-nextjs-homepage-and-ordering-flow-design.md) (§3 Stack, §7 structure, §9 docs)
- Depends on: none (first phase)
- Unblocks: 02, 03, 04, 05, 06

## Overview
- **Date:** 2026-07-05
- **Description:** Stand up the empty-but-runnable Next.js 15 project: toolchain, design tokens, fonts, lint/format, test harness, base layout shell, image config, README + docs skeleton.
- **Priority:** P1 (blocks everything)
- **Implementation status:** complete (lint/build/test green on Node 22)
- **Review status:** reviewed — 2 medium fixes applied (jest-dom/vitest type import, `.env*` gitignore catch-all) + minor cleanups
- **Deferred:** migrate `next lint` → ESLint CLI before a Next 16 bump (works fine on Next 15)

## Key Insights
- Tailwind **v4** uses `@tailwindcss/postcss` + CSS-first config (`@theme` / `@import "tailwindcss"`), NOT `tailwind.config.js` `content` globs. Tokens live as CSS variables in `globals.css`. Spec §12 permits v3 fallback only if blocked — note it if used.
- `next/font/google` self-hosts Instrument Serif + Hanken Grotesk; expose as CSS variables (`--font-display`, `--font-body`) applied on `<body>`.
- App runs empty first — no feature code — so scaffold correctness (build + lint + test all green on an empty page) is the phase gate.

## Requirements
**Functional**
- `npm run dev/build/start/lint/test` all succeed on a placeholder homepage.
- Fonts render; design tokens available as CSS vars + Tailwind utilities.
- `next.config` allows remote images from `assets.foodhub.com`.

**Non-functional**
- Node 20+; strict TypeScript; ESLint `next/core-web-vitals`; Prettier.
- Each source file < 200 lines; kebab-case filenames.

## Architecture
- **App Router** root: `app/layout.tsx` (fonts + `<body>` shell + globals import), `app/page.tsx` (temporary placeholder replaced in Phase 03).
- **Styling pipeline:** `postcss.config.mjs` → `@tailwindcss/postcss`; `app/globals.css` holds `@import "tailwindcss"`, `@theme` token mapping, and `:root` CSS variables (brand/ink/muted/subtle/line/surface).
- **Test harness:** `vitest.config.ts` with `jsdom` env, `@testing-library/jest-dom` setup file, path alias `@/*`.
- **Data flow:** none yet — this phase produces static shell only.

## Related code files
**Create**
- `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`
- `postcss.config.mjs`, `app/globals.css`
- `app/layout.tsx`, `app/page.tsx` (placeholder)
- `.eslintrc.json` (or `eslint.config.mjs`), `.prettierrc`, `.prettierignore`, `.gitignore`
- `vitest.config.ts`, `vitest.setup.ts`
- `README.md`
- `docs/project-overview.md`, `docs/system-architecture.md`, `docs/codebase-summary.md`, `docs/features.md`, `docs/design-guidelines.md`, `docs/changelog.md` (skeletons)

**Modify:** none

## Implementation Steps
1. Init `package.json`; add deps: `next@15`, `react@19`, `react-dom@19`, `zustand`. Dev deps: `typescript`, `@types/react`, `@types/node`, `tailwindcss@4`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`, `prettier`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@vitejs/plugin-react`.
2. Add scripts: `dev`, `build`, `start`, `lint`, `test`, `test:watch`.
3. `tsconfig.json`: strict, `moduleResolution: bundler`, path alias `@/*` → project root.
4. `postcss.config.mjs`: `{ plugins: { '@tailwindcss/postcss': {} } }`.
5. `app/globals.css`: `@import "tailwindcss";` then `@theme { --color-brand:#2F6B4F; --color-ink:#141414; --color-muted:#767676; --color-subtle:#5a5a5a; --color-line:#ececec; --color-line-strong:#e2e2e2; --color-surface:#fff; --color-surface-alt:#fafafa; --radius-card:16px; --radius-btn:10px; }` + base body/typography defaults.
6. `app/layout.tsx`: load Instrument Serif + Hanken Grotesk via `next/font/google` → CSS vars on `<html>`/`<body>`; import globals; render `{children}` (promo/header/footer/overlays added Phase 03/05, leave a TODO comment).
7. `app/page.tsx`: minimal placeholder ("Viki — coming soon") to make build/lint pass.
8. `next.config.ts`: `images.remotePatterns` → `{ protocol:'https', hostname:'assets.foodhub.com' }`.
9. ESLint (`next/core-web-vitals`) + Prettier configs + `.gitignore` (node_modules, .next, coverage).
10. `vitest.config.ts`: `plugins:[react()]`, `environment:'jsdom'`, `setupFiles:['./vitest.setup.ts']`, alias `@`. `vitest.setup.ts`: `import '@testing-library/jest-dom'`. Add one trivial smoke test (`1+1`) so `npm test` exits 0.
11. Write `README.md` (setup, scripts, stack overview) + docs skeletons (headings + "TBD — populated in later phases", changelog seeded with a 2026-07-05 "scaffold" entry).
12. Run `npm run lint`, `npm run build`, `npm test` — all must pass.

## Todo list
- [x] `package.json` + deps + scripts
- [x] `tsconfig.json` with `@/*` alias
- [x] Tailwind v4 postcss + `globals.css` tokens
- [x] Fonts wired in `layout.tsx`
- [x] Placeholder `app/page.tsx`
- [x] `next.config.ts` remotePatterns (assets.foodhub.com)
- [x] ESLint + Prettier + `.gitignore`
- [x] Vitest + jest-dom + smoke test
- [x] README + 6 docs skeletons + changelog seed
- [x] `lint` + `build` + `test` green
- [x] `.nvmrc` (Node 22) + `outputFileTracingRoot` pin (workspace-root fix)

## Success Criteria
- `npm run dev` serves placeholder; `npm run build` succeeds; `npm run lint` clean; `npm test` passes.
- Design token CSS vars resolve; both fonts load without console errors.
- `docs/` contains all six files (skeleton) + README present.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Tailwind v4 postcss friction (new major) | Med | Med | Use standard `@tailwindcss/postcss`; if blocked, fall back to v3 config-based setup and note it in changelog + design-guidelines. |
| React 19 / Next 15 peer-dep mismatches | Low | Med | Pin exact tested versions; run `build` immediately after install. |
| Path alias not honored by Vitest | Low | Low | Mirror `@` alias in both `tsconfig` and `vitest.config`. |

## Security Considerations
- No secrets/env in this phase. `.gitignore` must exclude `.env*`, `node_modules`, `.next`, `coverage` before any commit.
- `remotePatterns` scoped to a single trusted host — no wildcard image sources.

## Next steps
- Phase 02 adds the typed data + pricing/store core that all UI phases consume.
