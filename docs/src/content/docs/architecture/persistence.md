---
title: Data storage and streaks
description: All the games save data with the same shared functions.
---

All five games save data with one shared set of functions. The reason is history: the save guards below were fixed four separate times in individual games before the shared recipe existed. The extraction froze the fix count at four. A new game must use these functions. Do not write localStorage code in a game.

## Storage with a namespace

The function `createGameStore(gameId)` is in `src/lib/storage/createGameStore.ts`. It gives a store with the functions `get`, `set`, `remove`, and `keys`. Each key gets this prefix:

```
wg:v1:local:<gameId>:<key>
```

The part `local` is the profile id, and it is the seam for future accounts. The design: swap the storage adapter, map `local` to a user id, and no game code changes at all. The default adapter writes JSON to localStorage. A read of unserviceable data gives `null`. A failed write sends the event `wg:storage-error`. The hook `useStorageBroken()` receives this event.

## The daily storage functions

The function `createDailyPersistence()` is in `src/lib/daily/persistence.ts`.

### The configuration

```ts
createDailyPersistence<Day, Stats>({
  gameId,             // storage namespace
  emptyStats,         // default stats; loads merge over this
  validDay,           // game-specific shape check for a saved day
  dayKey?,            // save key part; default is the dateKey.
                      // Doublet uses "<difficulty>:<dateKey>".
  allowUnsolvedWrite?, // veto for unsolved saves (multi-tab guard)
})
```

`Day` extends `DailyBase` and `Stats` extends `StreakStats`:

```ts
DailyBase = { dateKey, dictVersion, solved, elapsedMs, statsRecorded?, puzzleKey? }
StreakStats = { played, solved, currentStreak, bestStreak, lastSolvedDate }
```

The field `puzzleKey` is a deterministic fingerprint of the puzzle for a given date. When present on both a saved day and the current puzzle, `puzzleKey` is compared instead of `dictVersion` to detect staleness. This means an unrelated `DICT_VERSION` bump (for example, a Doublet generator change) does not wipe a Crosshatch save whose actual puzzle has not changed. Legacy saves without a `puzzleKey` fall back to the `dictVersion` comparison.

### The returned functions

- `loadDay(subKey, currentPuzzleKey?)` — gives the saved day, or null when the save does not match the current puzzle. When both the save and the caller provide a `puzzleKey`, those are compared; otherwise the function falls back to `dictVersion`.
- `loadStaleDay(subKey, currentPuzzleKey?)` — gives only saves that do not match the current puzzle (the inverse of `loadDay`).
- `saveDay(progress, opts?)` — writes a day save, with the guards below.
- `loadStats()` and `updateStats(fn)` — the statistics blob. Loads merge over `emptyStats`, so new fields ship safely. Updates go through an internal lock, one at a time.
- `recordStarted(dateKey)` — counts a played day one time.
- `loadDaysByDate()` — every saved day, grouped by date. This is the first step of every archive roll-up. A game with one board a day gets groups of one; the multi-board games get one entry per board, which is what their listings merge. A save with no `dateKey` is skipped.
- `loadCoachSeen()` and `markCoachSeen()` — the instructions-seen flag.
- `store` and `validShape` — the raw store and the shared shape check, for game-specific extras.

### The multi-board rules

Three games give the player more than one board a day: Crosshatch (2), Serpentine (2), Doublet (3). **The day is the unit.** `played`, `solved` and the streak all count days, not boards, in every game. Three shared helpers hold that rule so it cannot drift apart again:

- `isFirstBoardOfDay(boards, current, load)` — does opening this board start a new day? Gates `played`, and the analytics `started` event fires on the same answer.
- `everyOtherBoardSolved(boards, current, load)` — does solving this board finish the day? Gates `solved` and the streak.
- `sumAcrossBoards(saves, read)` — a counter summed across a date's boards, or `null` when any board predates it. A partial sum presented as a day's total is as fake as a zero, so a mixed day charts as a gap.

Both of the first two ask about the OTHER boards and take the calling board as solved or present by construction. That board's own save is written by a different effect, and racing it would drop a streak at random.

One historical wrinkle: Doublet and Serpentine counted `played` and `solved` per BOARD until this rule landed, so totals from before it are larger than the days they represent. Crosshatch is unaffected — every Crosshatch day before its Hard board had exactly one board.

### The save guards, and the failures they prevent

- **A save with a newer dictionary version stays.** An older save cannot replace it. Without this guard, two open tabs on different deployments destroy each other's progress.
- **A solved save is final.** Nothing replaces it. This guard applies regardless of dictionary version — a newer-build tab cannot overwrite a solved save with an unsolved one. Without this guard, a clock restart or a replay could erase a finished day.
- **`allowUnsolvedWrite` can veto unsolved saves.** This is the multi-tab guard for games where a second tab must not write over live progress.

### Old saves

The start-sequence rule every game follows: if `loadDay` gives null and `loadStaleDay` gives a save, the day already counted. Copy `statsRecorded` from the old save. Do not use `recordStarted()`. If you do not obey this rule, the played count increases two times.

## Streak rules

- `countsAsToday(dateKey, allowGrace)` — a solve counts on the same day, or for yesterday in the short time after midnight. This margin applies only to daily sessions. Set `allowGrace` to false for archive sessions.
- `streakAdvance(stats, dateKey, allowGrace)` — the streak change for a solve.
- `displayStreak(stats, today?)` — the streak for the screen. It gives zero for a streak that stopped. Always use this function to show a streak, or a lapsed streak shows a stale count.

## The clock

The hook `useDailyClock(options)` is in `src/lib/daily/useDailyClock.ts`. It measures active time only.

The options:

- `flush(elapsedMs)` — required. The hook calls it when the page hides, closes, or unmounts, so progress saves before the tab dies.
- `resetKey?` — when this value changes, the hook removes and adds its listeners again, with a final flush in between. It does not reset the counters — only `hydrate` does that.

The returns:

- `rawElapsedMs` — the counter reference.
- `currentElapsedMs()` — the live elapsed time.
- `hydrate(savedElapsedMs, alreadySolved)` — sets the clock from a save. A day that is already solved keeps its saved time and stays frozen.
- `freeze()` — stops the clock at the solve. Safe to call more than one time.

The clock stops when the application goes to the background and continues when it returns. Time away from the game does not count.
