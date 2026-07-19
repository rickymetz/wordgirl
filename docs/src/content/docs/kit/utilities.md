---
title: Game Kit — hooks & utilities
description: The src/lib toolbox — dates, randomness, viewport, sharing, settings, and the solve transition.
---

Everything here lives in `src/lib/`. Storage and daily persistence have
[their own page](/architecture/persistence/); the dictionary has
[one too](/architecture/dictionary/).

## Dates (`date.ts`, `useToday.ts`)

The **dateKey** (`YYYY-MM-DD`, local timezone) is the universal daily-puzzle
identifier. Daily puzzles always derive from the *local* date, and a
session's dateKey is frozen per mount.

- `localDateKey(date?)` — today's key.
- `previousDateKey(key)` — noon-based arithmetic, so DST transitions can't
  skip or repeat a day.
- `dateKeyRange(from, to)`, `formatDateKey` ("Sunday, July 5"),
  `formatShareDate` ("July 10"), `formatDuration` ("12:34", "1:02:03").
- `useToday()` — a *live* dateKey via `useSyncExternalStore`: polls each
  minute and re-checks on visibilitychange, so hub cards and archives roll
  over at midnight and on PWA resume.

## Randomness (`random.ts`)

- `seededRandom(seed: string)` — xmur3 hash → mulberry32 PRNG, `[0, 1)`.
- `shuffle(items, rand)` — in-place Fisher–Yates.
- `randomSeed()` — crypto-random seed for practice mode.

Consumption order is part of the contract — see
[How daily puzzles work](/games/daily-puzzles/).

## Viewport (`useViewport.ts`)

`useViewport() → { vw, vh, rem }` for board size budgets:

- `vh` is `innerHeight` minus `#root`'s safe-area padding — the space you
  actually have.
- `rem` is the live root font size (the Text-size setting). **Scale every
  pixel constant by `rem / 16`** so boards grow with the user's text size.

## Sharing (`share.ts`)

- `SHARE_URL = "wordgirl.net"` — every share string ends with it.
- `useShare(text) → { share, copied, failed }` — native share sheet first
  (user dismissal is not an error), clipboard fallback with timed flags.
  Usually consumed via `ShareButton`.

## Settings (`settings.ts`)

`{ theme: "system" | "light" | "dark", fontScale }` with scales
87.5–125%. `applySettings` sets `html[data-theme]`, the root font-size, and
rewrites the `theme-color` metas. Stored at `wg:v1:local:settings`.

## Solve transition (`useSolveTransition.ts`)

`useSolveTransition(solved, hydratedAsSolved?) → { showConfetti, showResults }`
— on a fresh solve: 1.5 s of confetti, then the results card. Hydrating an
already-solved day skips straight to results. Pair with `ConfettiOverlay`.

## Misc

- `analytics.ts` — thin Fathom wrapper: `trackSolved`, `trackShare`,
  `trackPractice`, `trackStarted`, `trackArchivePlay`, each emitting
  `<gameId>:<event>`.
- `swUpdate.ts` — `checkForUpdates()` for the Settings row; see
  [PWA & offline](/architecture/pwa-offline/).
- `useStorageBroken()` — flips true on the `wg:storage-error` event.

## Reference implementations

Some patterns are deliberately *not* extracted — copy them from the game
that owns them:

- **Drag & drop**: `src/games/backwords/ui/dragPoint.ts` plus the
  LetterBank/MirrorBoard wiring — pointer fallback, cancel-aborts,
  tap-vs-drag guard, live ghost via direct DOM writes (never setState per
  drag frame).
- **Two-cell pieces**: `src/games/doublet/ui/DominoTray.tsx`.
- **Polygon morphing**: `src/games/polygram/ui/`.
