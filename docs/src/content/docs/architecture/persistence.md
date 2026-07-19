---
title: Data storage and streaks
description: All the games save data with the same shared functions.
---

All five games save data with one shared set of functions. A new game must use these functions. Do not write localStorage code in a game.

## Storage with a namespace

The function `createGameStore(gameId)` is in `src/lib/storage/createGameStore.ts`. It gives a store with the functions `get`, `set`, `remove`, and `keys`. Each key gets this prefix:

```
wg:v1:local:<gameId>:<key>
```

The part `local` is the profile id. A future account function can replace it. The store writes JSON to localStorage. A read of unserviceable data gives `null`. A failed write sends the event `wg:storage-error`. The hook `useStorageBroken()` receives this event.

## The daily storage functions

The function `createDailyPersistence()` is in `src/lib/daily/persistence.ts`. It gives all the functions for a daily game: `loadDay`, `loadStaleDay`, `saveDay`, `loadStats`, `updateStats`, `recordStarted`, `loadCoachSeen`, and `markCoachSeen`.

The day data extends `DailyBase`:

```ts
{ dateKey, dictVersion, solved, elapsedMs, statsRecorded? }
```

### Protection rules for saveDay

- A save with a newer dictionary version stays. An older save cannot replace it. This condition occurs with two open tabs on different versions.
- A solved save is final. No save can replace it.
- A game can refuse saves of days that are not solved. This option is the multi-tab protection.

### Old saves

The function `loadDay` does not show saves with a different dictionary version. The puzzle for such a save is not available now. The function `loadStaleDay` shows only these old saves. Each game applies this rule at the start: if `loadDay` gives null and an old save exists, the day already counted. Copy `statsRecorded` from the old save. Do not use `recordStarted()`. If you do not obey this rule, the played count increases two times.

### Statistics

The statistics extend `StreakStats`: played, solved, currentStreak, bestStreak, and lastSolvedDate. A load mixes the data with the default values. Thus new fields are safe. The function `updateStats` uses a lock. Always use `updateStats` after `saveDay` is complete.

## Streak rules

- The function `countsAsToday(dateKey, allowGrace)` examines a solve for the streak. A solve counts on the same day. A solve for yesterday counts in the short time after midnight. This margin applies only to daily sessions. Set `allowGrace` to false for archive sessions.
- The function `streakAdvance()` calculates the streak change for a solve.
- The function `displayStreak()` gives the streak for the screen. It gives zero for a streak that stopped. Always use this function to show a streak.

## The clock

The hook `useDailyClock()` is in `src/lib/daily/useDailyClock.ts`. It measures only active time:

- The clock stops when the application goes to the background.
- The clock writes the saves when the page hides, closes, or unmounts. Thus you do not lose progress.
- The function `freeze()` stops the clock at the solve. A day that is already solved keeps its saved time.
- The option `resetKey` prepares the clock again when the date or the difficulty changes.
