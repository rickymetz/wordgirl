---
title: Game Kit — components
description: The shared UI pieces every game is built from — tiles, toasts, sheets, dialogs, and the auto-generated archive and trends pages.
---

House rule: **check the kit before building anything.** If you catch
yourself copying code from a sibling game a second time, extract it into the
kit instead of pasting.

## Board & feedback (`src/components/game/`)

### `Tile` / `tileClasses` / `TileSocket`

The letter tile — THE letter tile; there is exactly one. Four tones:

| Tone | Use |
|------|-----|
| `tile` | resting, warm grey — on plain surfaces only |
| `surface` | punch-out on tinted panels |
| `accent` | highlighted |
| `ghost` | translucent reading/preview |

`mini` gives bento-card sizing (used by hub previews).
`tileClasses(tone, mini?)` returns the same visuals as a class string for
motion-wrapped elements (layoutId flights, drag ghosts) that can't nest the
component. `TileSocket` is the dashed empty home; pass `subdued` on tinted
panels.

### `GameToast` + `useToast()`

The floating feedback pill over a board ("Not a word"). `useToast()` returns
`{ toast, show(text, durationMs?) }`; the toast carries a nonce so repeated
messages re-animate. `GameToast` renders with `AnimatePresence mode="wait"`
and is `aria-hidden` — mirror `toast?.text` into an `aria-live` region
yourself for narration.

## Dialogs & chrome (`src/components/`)

- **`BottomSheet`** — bottom sheet on phones, centered modal ≥ 768px.
  Blurred backdrop, Escape, focus containment, reduced-motion-aware
  springs, safe-area padding. Mount inside `<AnimatePresence>`.
- **`CoachSheet`** (+ `Key`) — the how-to-play sheet; each game supplies
  `CoachRule[]` (`{ Icon, title, body }`). The "Got it" button carries
  `data-autofocus`.
- **`ModalDialog`** — centered confirmation card (replay confirmations,
  etc.). Omit `onClose` to disable backdrop/Escape dismissal.
- **`useModalFocus(active)`** — focus containment for all of the above:
  focuses `[data-autofocus]` (the container itself is allowed — results
  cards do this), traps Tab, restores opener focus on close.
- **`SettingsDialog`** — theme + text-size radio groups; wrapped in
  `data-level="neutral"`.
- **`HomeLink`** — hub link with expanded hit area.
- **`ConfettiOverlay`** — one-shot canvas burst on solve; skipped under
  `prefers-reduced-motion`. Sequenced by `useSolveTransition` (see
  [utilities](/kit/utilities/)).
- **`StoragePrompt`** — durable-storage request, auto-rendered by the game
  layout.

## Results & sharing

**`ShareButton`** (`{ text, gameId? }`) — the accent share pill: native
share sheet where available, clipboard fallback, "Copied!" flash, analytics
event. Cards render `<ShareButton text={buildShareText(…)} />`; only the
share *string* is game-local. Strings end with `SHARE_URL` and may use emoji
— the only place emoji are allowed.

## Hub & archive

### `GameStatus`

The hub-card status block: today's date plus a play-state line
("Solved ✓ · 3-day streak"). Games pass two loaders,
`loadState(today)` and `loadStreak(today)` — about 15 lines per game.
Reloads itself on midnight rollover and PWA resume.

### `GameArchive`

The **entire archive page from a config** — never hand-roll one. A
`GameArchiveConfig` supplies: `gameId`, `accent` (= the game's
`accentLevel`), `epoch`, `loadAllDays()`, `loadStats()`,
`hasPlayed(stats)`, six `statTiles(stats)`, `isDone(day)`, and
`rowStatus(dateKey, day)`. The component owns all layout and color — stats
grid, month calendar mosaic, scoreboard rows — and sets
`data-level={accent}` itself. ~30 lines of config per game; see any game's
`ui/ArchivePage.tsx`.

### `GameTrends`

The stats-over-time page from a `GameTrendsConfig`: per-metric single-series
sparklines in the game's accent over a 30-day window, tap-a-day for values,
plus an optional solve-hour histogram. Metrics are
`{ key, label, value(day) → number | null }` — return `null` for days
before a metric shipped, which chart as **gaps, never fake zeros**. See
[Charts](/design/charts/) for the style rules it embodies.
