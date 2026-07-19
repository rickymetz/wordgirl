---
title: Layout, motion & type
description: The no-scroll rule, touch targets, reduced motion, and the two-font system.
---

## The no-scroll rule

**No game screen may have a page scroll when content fits.** `#root` is
exactly `100dvh` as a flex column, with safe-area insets applied as *inside*
padding; pages use `grow`, never `min-h-dvh`. Overscroll is disabled
(`overscroll-behavior-y: none`).

Board height budgets must scale with the root font size: use
`useViewport()` — its `vh` already excludes the safe-area insets, and its
`rem` is the live Text-size setting. Any pixel constant in a board layout
gets multiplied by `rem / 16`.

## Touch & pointer rules

- Touch targets ≥ ~44px — invisible `::after` expansion or negative-margin
  padding is fine when the visual element is smaller.
- Game surfaces get `touch-manipulation` and `select-none`.
- Buttons on game surfaces call `e.preventDefault()` in `onPointerDown` so
  taps never steal focus from the grid.
- Any puzzle input closes an open words panel; window-level Enter/Space
  handlers defer to a focused control
  (`target.closest("button…")`).

## Dialogs

Sheets (settings, how-to-play) are `BottomSheet` / `CoachSheet` inside
`<AnimatePresence>`; centered confirmations are `ModalDialog`. Every dialog
gets focus containment via `useModalFocus`, with the intended initial focus
marked `data-autofocus` (the container itself for results cards).

## Motion

Three layers of reduced-motion respect:

1. A global CSS clamp: under `prefers-reduced-motion: reduce`, all
   transitions and animations drop to 0.01 ms with `!important`.
2. `<MotionConfig reducedMotion="user">` at the app root.
3. Component-level checks where CSS can't reach — `BottomSheet` uses
   `useReducedMotion`, `ConfettiOverlay` skips its canvas burst entirely.

## Typography

- `--font-display` — Avenir Next / ui-rounded / system-ui stack for UI.
- `--font-game` — **Rubik Mono One**, the heavy square monospace for game
  glyphs. Because it's monospaced, hidden letters render as `?` in
  `font-game` wherever they appear — chips, word lists, the typed-word
  tray — so **nothing reflows as letters fill in**.
- Root font size is 18px at ≥ 768px, and the user's Text-size setting
  scales it 87.5–125%.

## Copy & iconography

- Neutral, descriptive labels. No flavor text, no jargon. Rank and coach
  headlines are plain ("Clear the level", not "Grow the flock").
- **lucide-react icons only** in UI chrome. Emoji are allowed in share
  strings only.
- A game's title glyph comes **after** the title, never before
  ("Serpentine ⟆", not "⟆ Serpentine") — in game headers and anywhere
  else the pairing appears (docs, marketing).
- Archive separators use `·`, not `.`.
