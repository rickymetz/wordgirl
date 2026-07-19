---
title: How to add a new game
description: The 14 steps from the engine to the hub card.
---

Each game follows the same procedure. The procedure has 14 steps. The kit does most of the work. A new game is an engine, a reducer, and short configurations for the shared pages.

This is the full list:

1. Make the game folder.
2. Add the game to the registry.
3. Add the accent color token.
4. Connect the storage functions.
5. Connect the clock.
6. Make the archive page.
7. Make the trends page.
8. Make the hub card.
9. Make the hub preview.
10. Make the instructions sheet.
11. Make the share text.
12. Add the replay confirmation.
13. Write the tests.
14. Do the color check.

## Step 1: Make the game folder

Make the folder `src/games/<id>/`. Give it the subfolders `engine/`, `state/`, and `ui/`. The engine contains pure TypeScript. The state folder contains the hooks and reducers. The ui folder contains the components.

## Step 2: Add the game to the registry

Add a `GameDefinition` item to `src/games/registry.ts`. The item contains the id, the name, the tagline, `themeColor`, the `accentLevel` key, the page component, and the extra routes. The hub pieces from steps 7 to 9 also connect here: the trends page through `secondaryActions`, the status line through `Status`, and the preview art through `Preview`. The router finds the game automatically. Refer to the [architecture overview](/docs/architecture/overview/) for the full field list.

## Step 3: Add the accent color token

1. Add a `[data-level="<id>"]` token block in `src/index.css`.
2. Set `data-level={accentLevel}` on each game surface. The game surfaces are the game screen, the archive, the practice mode, and the stats.
3. Make sure that the light mode accent is a dark tone. Refer to the [contrast rules](/docs/design/colors/).

## Step 4: Connect the storage functions

Use `createDailyPersistence`. The rules are on the [storage page](/docs/architecture/persistence/). Copy the start sequence from an available game. A note on names: each game wraps the kit functions in its own `persistence.ts` with names such as `saveDailyProgress` and `loadStaleDailyProgress`, and its state hook adds `abandonSession()`. These wrappers live in the game folder, not in `src/lib/daily/`. Obey these rules:

- Set `hydrated.current` in the async load function, not outside it.
- If the save for today is old, copy `statsRecorded` from it. Do not use `recordStarted()`. If you do not obey this rule, the played count increases two times.
- Use `updateStats` only after the day save is complete.
- The daily puzzle comes from the local date. The date does not change while the game is open.
- The midnight margin applies only in daily mode. Set `allowGrace` to false for archive sessions.

## Step 5: Connect the clock

Use `useDailyClock`. Do not write your own timer. Stop the clock at the finish. Use `abandonSession()` before a replay reset. Put the date and the difficulty in the `resetKey` option.

## Step 6: Make the archive page

Use the `GameArchive` component with a `GameArchiveConfig`. Do not make the page by hand. The configuration is approximately 30 lines. Refer to `ui/ArchivePage.tsx` in an available game.

## Step 7: Make the trends page

Use `GameTrends` with a `solvedHour` metric. Put the page at the route `stats`. Add a "Stats" item to the registry entry's `secondaryActions`. Refer to [Charts](/docs/design/charts/).

## Step 8: Make the hub card

Use `GameStatus` with two load functions. One function gives the state text. One function gives the streak. This is approximately 15 lines.

## Step 9: Make the hub preview

Make a small preview component for the hub card. Use `Tile` with the `mini` option. Refer to `BackwordsPreview` for the pattern.

## Step 10: Make the instructions sheet

Show the instructions with `CoachSheet`. Give it a list of `CoachRule` items. Each item has an icon, a title, and a text.

## Step 11: Make the share text

End the share text with `SHARE_URL`. Use `ShareButton`. Do not permit shares in practice mode. Emoji are permitted only in the share text.

## Step 12: Add the replay confirmation

Show a `ModalDialog` confirmation before a replay.

## Step 13: Write the tests

Make a minimum of three test files:

1. `engine/*.test.ts` for the pure logic. These tests operate in Node.
2. `state/reducer.test.ts` for the state machine.
3. `state/persistence.dom.test.ts` for the storage rules.

Refer to [Tests and checks](/docs/guides/testing/).

## Step 14: Do the color check

Use `scripts/validate_palette.js` after you add the accent.

## Before the merge

The review gate is this list. It is also in `CLAUDE.md`. Make sure that each item is correct:

- The load function sets `hydrated.current` in the async callback.
- The clock `resetKey` contains all the applicable keys. Examples are the difficulty and the date key.
- `updateStats` operates only after `saveDailyProgress` is complete.
- The old save rule prevents a double count of played days.
- Each SVG overlay has `preserveAspectRatio="xMidYMid meet"`.
- The board sizes multiply by `rem / 16` through `useViewport`.
- The pointer handlers on game surfaces use `e.preventDefault()`.
- `ShareButton` shows only when a `dateKey` is present. Practice mode has no share.
- A replay shows a confirmation dialog.
- The archive separators use `·`, not `.`.
- The UI has no emoji. Emoji are only in share texts.
- The three test files exist.
