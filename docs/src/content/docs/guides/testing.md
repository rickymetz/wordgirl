---
title: Tests and checks
description: The test projects, the file rules, and the check procedure.
---

## The test projects

The file `vite.config.ts` configures Vitest with two projects:

| Project | Files | Environment |
|---------|-------|-------------|
| `unit` | `src/**/*.test.ts`, without `*.dom.test.ts` | Node |
| `dom` | `src/**/*.dom.test.ts` | jsdom |

The engines are pure TypeScript. Their tests operate in Node. These tests are fast. The DOM tests examine the parts that need a browser environment. Examples are localStorage, the storage rules, and the reducers. There are no React component tests. The tests examine the engines and the state.

## The file rules for each game

Each game has a minimum of three test files:

1. `engine/*.test.ts` examines the generator, the checks, and the scores. The generator tests use many seeds. They make sure that the quality limits hold.
2. `state/reducer.test.ts` examines the state machine.
3. `state/persistence.dom.test.ts` examines the save rules, the old save rule, and the streaks.

The kit tests are adjacent to their modules. Examples are `lib/date.test.ts`, `lib/random.test.ts`, and `lib/words/dictionary.test.ts`.

## The gate

`npx vitest run` and `npm run build` must be successful before each commit. The CI does the same steps on Node 22. Refer to `.github/workflows/ci.yml`.

## The UI checks

For UI changes, examine the real production build. Do not examine only the development server.

1. Do `npm run build` and then `npm run preview`. The port is 4173.
2. Control the browser with playwright-core scripts. Import from `node_modules/playwright-core/index.mjs`. Use the installed Chromium.

The usual checks are:

- No page scroll. Examine the default text size, the largest text size, and a screen with a notch.
- The focus paths for accessibility. Examine the dialogs, `data-autofocus`, and the focus return.
- The settings and the service worker update sequence.
- One short play in each game.
- Screen captures in the light theme and the dark theme at 390 by 844 pixels.

## The color check

Each new or changed color goes through `scripts/validate_palette.js`. The script calculates the contrast and the color vision safety. Do not examine colors with your eyes only.

## Work on these documentation pages

The documentation is its own small project in `docs/`:

1. Do `cd docs`, then `npm ci`, then `npm run dev` for a local server.
2. `npm run build` makes the static site. The site builds with the base path `/docs`.
3. A push to `main` that touches `docs/**` starts the workflow `.github/workflows/docs.yml`. It publishes the build to GitHub Pages.
4. `netlify.toml` proxies `wordgirl.net/docs/*` to that Pages deployment. Thus the docs live on the main domain with no DNS setup. The direct Pages address looks unstyled — that is expected, because the styles use the `/docs` base path.
