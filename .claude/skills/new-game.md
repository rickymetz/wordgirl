---
description: Scaffold a new game with all required files and registrations
user_invocable: true
arguments:
  - name: id
    description: "Game ID (lowercase, used as folder name and registry key)"
    required: true
---

# New Game Scaffold

Scaffold a new game called `<id>` with all required folders, files, and registrations.

Before starting, read `CLAUDE.md` for the full house rules. Read an existing game (backwords or crosshatch) as a reference for every pattern below.

## 1. Create folder structure

```
src/games/<id>/
  engine/
  state/
  ui/
```

## 2. Create engine files

### `engine/types.ts`
Puzzle and cell types for this game. Export the puzzle shape (e.g. `Puzzle`, `Cell`) and any enums the generator and reducer both need.

### `engine/generator.ts`
- Export `dailySeed(dateKey: string): number` — deterministic seed from the date.
- Export `generatePuzzle(seed: number): Puzzle` — pure function, no side effects.
- Import `seededRandom` from `src/lib/random.ts` for all randomness.
- Import and use the shared dictionary (`loadDictionary` / `parseDictionary` from `src/lib/words`) if the game needs words.

### `engine/generator.test.ts`
- Determinism: same seed produces identical puzzle.
- Puzzle validity: generated puzzles satisfy the game's constraints.
- Edge cases specific to this game's mechanics.

## 3. Create state files

### `state/reducer.ts`
- Export `GameState`, `Action` (discriminated union), `gameReducer`, and `initialState`.
- Keep the reducer pure — no persistence, no side effects.

### `state/reducer.test.ts`
- Test each action type in isolation.
- Test win/lose detection if applicable.

### `state/persistence.ts`
Use `createDailyPersistence` from `src/lib/daily/persistence`. Follow the exact pattern from backwords or crosshatch persistence. Export:
- `DailyProgress extends DailyBase` — the per-day save shape.
- Stats type `extends StreakStats` — cumulative stats shape.
- `loadDailyProgress(dateKey)` / `loadStaleDailyProgress(dateKey)` — load with stale fallback for hydration.
- `saveDailyProgress(dateKey, progress)` — save with multi-tab guard.
- `loadAllDailyProgress()` — for archive calendar.
- `loadStats()` / `displayStreak()` — stats with defaults-merge.
- `recordStarted(dateKey)` / a record-solved function — stat recording.
- `resetDailyForReplay(dateKey)` — replay support.
- `store` — the raw `createGameStore` instance.
- `ARCHIVE_EPOCH` — the first playable date as a dateKey string.

### `state/persistence.dom.test.ts`
- Round-trip save/load.
- Stale-save fallback behavior.
- Stats recording idempotency (`statsRecorded` guard).

### `state/use<Id>Game.ts`
The main game hook. Follow the existing game hooks exactly:
- Export a `GameMode` type: `"daily" | "archive" | "practice"`.
- Use `useDailyClock` from `src/lib/daily/useDailyClock` — never inline the clock.
- Hydrate from `loadStaleDailyProgress` on mount with stale-save fallback.
- Freeze the clock at solve (`clock.freeze()`).
- Expose `abandonSession()` that flushes and resets before replay.
- Save on every meaningful state change and on `visibilitychange`/`pagehide`.
- Return the state, dispatch, clock, mode, and any UI-facing helpers.

## 4. Create UI files

### `ui/<Id>Page.tsx`
Main game page. Wrap the outermost element with `data-level={accentLevel}` so accent tokens resolve. Lazy-exported as the default export for code splitting.

### `ui/ArchivePage.tsx`
Render the shared `GameArchive` component with a `GameArchiveConfig`. This should be ~30 lines of config — never hand-roll archive layout. See backwords or crosshatch `ArchivePage` for the exact config shape.

### `ui/TrendsPage.tsx`
Render the shared `GameTrends` component with a config. Route it at `stats` with a "Stats" secondary action.

### `ui/<Id>Preview.tsx`
Bento preview for the hub card. Use `Tile` with `mini` sizing (`tileClasses("tile", true)`). Keep it small and decorative — see `BackwordsPreview` for the idiom.

### `ui/<Id>Status.tsx` (optional)
Hub-card status line using `GameStatus`. Pass `loadState`/`loadStreak` loaders.

## 5. Create the game index

### `index.ts`
Export the `GameDefinition` object. Follow the backwords `index.ts` pattern exactly:
- `id`, `name`, `tagline`, `themeColor: "var(--color-accent)"`.
- `Preview` and optionally `Status` (eagerly imported).
- `Page` via `lazy(() => import("./ui/<Id>Page"))`.
- `extraRoutes` for archive, stats, and any practice/variant modes.
- `accentLevel: "<id>"` — the palette key for this game.
- `secondaryActions` array for hub bento tiles.

## 6. Register the game

### `src/games/registry.ts`
- Import the game definition from `./<id>`.
- Add it to the `games` array.

### `src/index.css`
Add a `[data-level="<id>"]` block with `--color-accent` and any related tokens as `light-dark()` values. Light-mode accent should be ~700-weight shade. Both directions (accent text on surface AND surface text on accent) must clear WCAG AA 4.5:1 contrast.

### Router
Add routes in the app router for `/games/<id>` and its extra routes (archive, stats, etc.). Follow the pattern used by existing games.

## 7. Post-scaffold checklist

After creating all files, remind the user to complete these steps:

- [ ] Run `node scripts/validate_palette.js` after adding the accent color to verify contrast and CVD safety.
- [ ] Add coach sheet content (how-to-play) using `CoachSheet` + `Key` components.
- [ ] Add a share string builder ending with `SHARE_URL` from `src/lib/share.ts`, wired through `ShareButton`.
- [ ] Add a replay confirmation dialog using `ModalDialog`.
- [ ] Verify `npx vitest run` passes.
- [ ] Verify `npm run build` passes.
- [ ] Drive the real build at `:4173` and screenshot both themes at 390x844.
- [ ] Check no-scroll at default and Huge text sizes.
