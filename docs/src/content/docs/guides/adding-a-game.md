---
title: Adding a new game
description: The 14-step checklist, narrated — from engine to hub card using the shared kit.
---

Every game follows the same recipe. The kit does most of the work; a new
game is mostly an engine, a reducer, and ~30-line configs for the shared
pages.

## 1–2. Folder and registry

Create `src/games/<id>/` with `engine/`, `state/`, `ui/` subdirectories, and
add a `GameDefinition` entry to `src/games/registry.ts` — id, name, tagline,
`accentLevel`, lazy `Page`, `extraRoutes`. The router picks it up
automatically ([registry pattern](/docs/architecture/overview/)).

## 3. Accent color

Add a `[data-level="<id>"]` token block in `src/index.css` and scope every
game surface with `data-level={accentLevel}`. Light-mode accent ~700-weight;
see the [contrast rules](/docs/design/colors/).

## 4–5. Persistence and clock

Wire `createDailyPersistence` — including the `loadStaleDailyProgress`
fallback on hydration — and `useDailyClock` (never an inline timer). The
patterns, guards, and streak rules are on the
[persistence page](/docs/architecture/persistence/). Copy the hydration shape
from an existing game hook; the subtle rules:

- Set `hydrated.current` *inside* the async hydration callback.
- If today's save is stale, copy `statsRecorded` from it and skip
  `recordStarted()` — otherwise played-days double-count.
- Chain `updateStats` after `saveDailyProgress` completes.
- Freeze the clock at the finish; `abandonSession()` before replay resets.
- Daily puzzles derive from the local date, frozen per mount; the midnight
  grace day applies only in daily mode (`allowGrace=false` for archive).

## 6–9. The shared pages

- **Archive**: render `GameArchive` with a `GameArchiveConfig` — never
  hand-roll the page. ~30 lines; see any game's `ui/ArchivePage.tsx`.
- **Trends**: `GameTrends` with a `solvedHour` metric, routed at `stats`.
- **Hub card**: `GameStatus` with `loadState`/`loadStreak` loaders.
- **Bento preview**: compose from `Tile mini` — see `BackwordsPreview` for
  the idiom.

## 10–12. Coach, share, replay

- How-to-play via `CoachSheet` with your `CoachRule[]`.
- Share string ends with `SHARE_URL`; render via `ShareButton`, gated on
  `dateKey` so practice mode never shares.
- Replay gets a `ModalDialog` confirmation.

## 13. Tests

Three files minimum: `engine/*.test.ts` (pure logic, Node),
`state/reducer.test.ts`, and `state/persistence.dom.test.ts` (jsdom). See
[Testing & verification](/docs/guides/testing/).

## 14. Palette validation

Run `scripts/validate_palette.js` after adding the accent.

## Before merging

The pre-merge checklist in `CLAUDE.md` is the review gate — hydration
ordering, clock `resetKey` coverage, stale-save fallback, SVG
`preserveAspectRatio`, `rem/16` board scaling, pointer `preventDefault`,
share gating, replay confirmation, `·` separators, no emoji in chrome, all
three test files.
