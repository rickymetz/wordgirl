---
title: Persistence & streaks
description: Namespaced storage, the shared daily-persistence recipe, save guards, streak math, and the active-time clock.
---

All five games persist through one shared recipe. If you're adding a game,
you use these pieces — never hand-rolled localStorage.

## Namespaced storage

`createGameStore(gameId)` (`src/lib/storage/createGameStore.ts`) wraps a
`StorageAdapter` (async `get`/`set`/`remove`/`keys`) and namespaces every
key as:

```
wg:v1:local:<gameId>:<key>
```

The `local` segment is `PROFILE_ID` — the seam where a future signed-in
profile would slot in for cloud sync. The default adapter is JSON over
localStorage; corrupt reads return `null`, and failed writes dispatch a
`wg:storage-error` event that `useStorageBroken()` surfaces in the UI.

## The daily persistence recipe

`createDailyPersistence({ gameId, emptyStats, validDay, … })`
(`src/lib/daily/persistence.ts`) returns everything a daily game needs:
`loadDay`, `loadStaleDay`, `saveDay`, `loadStats`, `updateStats`,
`recordStarted`, `loadCoachSeen`, `markCoachSeen`.

Day saves live at `daily:<dateKey>` and extend `DailyBase`:

```ts
{ dateKey, dictVersion, solved, elapsedMs, statsRecorded? }
```

### Save guards (`saveDay`)

- A save stamped with a **newer `dictVersion` is never clobbered** by an
  older one (two tabs on different deploys).
- A **solved save is final** — nothing overwrites it.
- Games can veto unsolved writes via `allowUnsolvedWrite` (the multi-tab
  guard).

### Stale saves

`loadDay` hides saves whose `dictVersion` doesn't match the current
dictionary — the puzzle they belong to no longer exists. `loadStaleDay`
returns exactly those. The hydration rule every game follows: if `loadDay`
is null but a stale save exists, the day was **already counted** — copy its
`statsRecorded` and skip `recordStarted()`, or the played count
double-increments.

### Stats

Stats extend `StreakStats`
(`played, solved, currentStreak, bestStreak, lastSolvedDate`), are merged
over defaults on load (new fields ship safely), and `updateStats` is
serialized behind an internal promise lock — always chain it *after*
`saveDay` completes.

## Streak math

- `countsAsToday(dateKey, allowGrace)` — a solve counts for the streak if
  it's today, or yesterday **within the midnight grace window** — but grace
  applies only to daily sessions (`allowGrace=false` for archive replays).
- `streakAdvance(stats, dateKey, allowGrace)` computes the streak delta for
  a solve.
- `displayStreak(stats, today?)` — anything that *shows* a streak calls
  this; it zeroes a lapsed streak instead of showing a stale count.

## The active-time clock

`useDailyClock({ flush, resetKey })` (`src/lib/daily/useDailyClock.ts`)
measures **active time only**:

- Banks elapsed time on `visibilitychange`; backgrounded time doesn't count.
- Flushes saves on hide, `pagehide`, and unmount, so closing the tab
  mid-puzzle loses nothing.
- `freeze()` stops the clock at the solve (idempotent); hydrating an
  already-solved day keeps the saved time verbatim.
- `resetKey` re-arms everything when the dateKey or difficulty changes.
