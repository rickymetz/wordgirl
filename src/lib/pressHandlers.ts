import type { MouseEvent, PointerEvent } from "react";

/**
 * Handlers for a game-surface button that must never swallow a tap
 * (letter keys, grid cells).
 *
 * A `click` is only synthesized when the pointer comes up close to where
 * it went down: a thumb that drifts while typing fast, or a tap that sets
 * off iOS's rubber-band bounce, gets its click CANCELLED, which reads as
 * "the key needs two or three presses". Measured in Chromium with touch
 * emulation: taps with ~24px of drift registered 0/10 via click. So the
 * action runs on `pointerdown`, which drift can't cancel, and `click` only
 * handles keyboard activation (Enter/Space arrive as a click with
 * `detail === 0`), so nothing fires twice.
 *
 * `preventDefault` on pointerdown also keeps focus where it is, so a tap
 * never steals focus from the grid (the house rule for game surfaces).
 * Pair with `touch-action: none` on the key row, so a drag that starts on
 * a key never turns into a scroll or bounce.
 */
export function pressHandlers(action: () => void) {
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      e.preventDefault();
      if (e.button === 0) action();
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (e.detail === 0) action();
    },
  };
}
