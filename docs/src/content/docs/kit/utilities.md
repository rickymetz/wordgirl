---
title: Game kit — hooks and utilities
description: The shared functions in src/lib.
---

All these functions are in `src/lib/`. The storage functions have [their own page](/docs/architecture/persistence/). The dictionary also has [its own page](/docs/architecture/dictionary/).

## Dates (`date.ts`, `useToday.ts`)

The date key has the format `YYYY-MM-DD` in the local time zone. It identifies the daily puzzle. Each game hook freezes its date key when the game opens — the key itself is live, the game session is not.

- `localDateKey(date?)` gives the key for today.
- `previousDateKey(key)` gives the key for the day before. It builds the date at noon, not midnight: `new Date(y, m - 1, d - 1, 12)`. The reason is daylight saving time. On a clock-change day, midnight arithmetic can land one hour into the neighbor day and skip or repeat a date. Noon is hours away from both edges, so the walk is safe.
- `dateKeyRange(from, to)`, `formatDateKey`, `formatShareDate`, and `formatDuration` are format functions.
- `useToday()` gives the live date key. It examines the date each minute. It also examines the date when the application comes to the front. Thus the hub changes at midnight.

## Random numbers (`random.ts`)

- `seededRandom(seed)` gives a random function from a seed text. It uses xmur3 and mulberry32.
- `shuffle(items, rand)` mixes a list.
- `randomSeed()` gives a random seed for practice mode.

The order of the random calls is frozen. Refer to [How daily puzzles work](/docs/games/daily-puzzles/).

## Viewport (`useViewport.ts`)

`useViewport()` gives `{ vw, vh, rem }` for board sizes:

- `vh` is the window height minus the safe area. This is the available space. The subtraction is not decoration: in installed PWA mode the safe-area padding is real and large, approximately 93 pixels.
- `rem` is the root font size. This is the text size setting. Multiply each pixel constant by `rem / 16`. Thus the boards change with the text size.

## Shares (`share.ts`)

- `SHARE_URL` is "wordgirl.net". Each share text ends with it.
- `useShare(text)` gives `{ share, copied, failed }`. It uses the system share sheet first. If not available, it copies the text. Use it through `ShareButton`.

## Settings (`settings.ts`)

The settings are the theme and the text size. The themes are system, light, and dark. The text sizes are 87.5 to 125 percent. The function `applySettings` sets the theme attribute, the root font size, and the theme color metas.

## The solve sequence (`useSolveTransition.ts`)

`useSolveTransition(solved, hydratedAsSolved?)` gives `{ showConfetti, showResults }`. A new solve shows confetti for 1.5 seconds. Then the results show. A day that was solved before shows the results immediately.

## Other functions

- `analytics.ts` sends events to Fathom. Each event is a name and nothing
  else, so it stays a count on a dashboard rather than a trace of anybody's
  play. Pageviews are not here — the script tag runs with `data-spa="auto"`
  and counts routes for us.
  - **Playing**: started, solved, share, practice, archive play.
  - **The tutorial funnel**: offered, accepted, started, finished. There is
    no abandoned event on purpose — it would have to fire on unmount, which
    a closed tab never does. Abandonment is started minus finished.
  - **Friction**: hint, replay, coach (the "?" sheet), skip level. Hint
    fires where a letter is spent, not where the button is tapped, so a
    declined confirmation counts nothing.
  - **Texture**: bonus word, sent when a rare word lands. There is no
    "swept" event — bonus words are not a target, so completing them is
    not a thing to measure.
  - **Reading the stats**: stats day, sent once a visit when a player
    reads a single day out of the charts.
  - **Display settings**: theme, text size, and font, as
    `setting:font:accessible`. App-level, so no game prefix, and they fire
    on a change rather than on a re-pick of the value already showing.
  - Game actions carry the game id (`serpentine:hint`); settings do not.
  - Offline play sends nothing — Fathom's script is not there, and queuing
    play locally to send later is the tracking this analytics choice avoids.
    So compare events with events, never with how many people played.
- `swUpdate.ts` contains `checkForUpdates()` for the settings dialog. Refer to [PWA and offline operation](/docs/architecture/pwa-offline/).
- `useStorageBroken()` becomes true after a storage error.

## Examples in the games

Some patterns stay in one game. Copy them from that game:

- Drag and drop: `src/games/pierglass/ui/dragPoint.ts` and the board components.
- Dominoes with two cells: `src/games/doublet/ui/DominoTray.tsx`.
- Polygon shape animation: `src/games/polygram/ui/`.
