---
title: How to add a new game
description: The 14 steps from the engine to the hub card.
---

Each game follows the same procedure. The kit does most of the work. A new game is an engine, a reducer, and short configurations for the shared pages.

## Steps 1 and 2: The folder and the registry

1. Make the folder `src/games/<id>/` with the subfolders `engine/`, `state/`, and `ui/`.
2. Add a `GameDefinition` item to `src/games/registry.ts`. The router finds the game automatically. Refer to the [architecture overview](/docs/architecture/overview/).

## Step 3: The accent color

1. Add a `[data-level="<id>"]` token block in `src/index.css`.
2. Set `data-level={accentLevel}` on each game surface.
3. Make sure that the light mode accent is a dark tone. Refer to the [contrast rules](/docs/design/colors/).

## Steps 4 and 5: Storage and clock

Use `createDailyPersistence` and `useDailyClock`. Do not write your own timer. The rules are on the [storage page](/docs/architecture/persistence/). Copy the start sequence from an available game. Obey these rules:

- Set `hydrated.current` in the async load function, not outside it.
- If the save for today is old, copy `statsRecorded` from it. Do not use `recordStarted()`. If you do not obey this rule, the played count increases two times.
- Use `updateStats` only after `saveDailyProgress` is complete.
- Stop the clock at the finish. Use `abandonSession()` before a replay reset.
- The daily puzzle comes from the local date. The date does not change while the game is open. The midnight margin applies only in daily mode. Set `allowGrace` to false for archive sessions.

## Steps 6 to 9: The shared pages

- Archive: use the `GameArchive` component with a configuration. Do not make the page by hand. The configuration is approximately 30 lines.
- Stats: use `GameTrends` with a `solvedHour` metric. Put the page at the route `stats`.
- Hub card: use `GameStatus` with two load functions.
- Hub art: make a small preview from `Tile` with the `mini` option. Refer to `BackwordsPreview`.

## Steps 10 to 12: Instructions, share, and replay

- Show the instructions with `CoachSheet` and a list of `CoachRule` items.
- End the share text with `SHARE_URL`. Use `ShareButton`. Do not permit shares in practice mode.
- Show a `ModalDialog` confirmation before a replay.

## Step 13: Tests

Make a minimum of three test files:

1. `engine/*.test.ts` for the pure logic. These tests operate in Node.
2. `state/reducer.test.ts` for the state machine.
3. `state/persistence.dom.test.ts` for the storage rules.

Refer to [Tests and checks](/docs/guides/testing/).

## Step 14: The color check

Use `scripts/validate_palette.js` after you add the accent.

## Before the merge

The list in `CLAUDE.md` is the review gate. It contains the start sequence rules, the clock keys, the old save rule, the SVG settings, the board size rule, the pointer rules, the share rule, the replay confirmation, the separators, the emoji rule, and the three test files.
