---
title: Testing & verification
description: The vitest projects, per-game test conventions, and the house verification procedure.
---

## Test projects

Vitest is configured with two projects in `vite.config.ts`:

| Project | Pattern | Environment |
|---------|---------|-------------|
| `unit` | `src/**/*.test.ts` (excluding `*.dom.test.ts`) | Node |
| `dom` | `src/**/*.dom.test.ts` | jsdom |

Engines are pure TypeScript, so their tests run in plain Node — fast and
deterministic. DOM tests cover what actually needs a browser-ish
environment: localStorage round-trips, persistence guards, reducer state
machines. There are deliberately no React component tests; testing focuses
on engines and state.

## Per-game conventions

Every game ships three test files minimum:

- `engine/*.test.ts` — generation, validation, scoring. Generator tests
  sweep many seeds and assert the quality gates hold (word-count bands,
  solution counts, connectivity).
- `state/reducer.test.ts` — the state machine.
- `state/persistence.dom.test.ts` — save/load guards, stale-save handling,
  streaks.

Kit tests live beside their modules: `lib/date.test.ts`,
`lib/random.test.ts`, `lib/storage/storage.dom.test.ts`,
`lib/words/dictionary.test.ts`.

## The gate

**`npx vitest run` and `npm run build` must pass before any commit.** CI
(`.github/workflows/ci.yml`) runs exactly that on Node 22 for pushes and
PRs.

## UI verification

For UI changes, drive the real production build, not the dev server:

1. `npm run build && npm run preview` (port 4173).
2. Automate with playwright-core scripts (import from
   `node_modules/playwright-core/index.mjs`, Chromium at a preinstalled
   executable path).

House checks:

- **No-scroll** at default text size, Huge text, and simulated notch
  insets.
- Accessibility focus paths (dialogs, `data-autofocus`, focus restore).
- Settings, and the service-worker update flow.
- A smoke run per game.
- **Screenshots in both themes at 390×844** for anything visual.

## Palette validation

Any new or changed color runs through `scripts/validate_palette.js` —
contrast and color-vision checks are computed, never eyeballed.
