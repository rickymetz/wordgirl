/**
 * Hint targeting. A hint reveals one cell of the solution path ON THE
 * GRID; the player only benefits from cells their snake has not already
 * reached, so targeting is always relative to their progress.
 *
 * Hints no longer prefer the first letter of each word. Those letters
 * are given for free in the readout (`wordStartIndices` in phrase.ts),
 * so what a hint adds is a POSITION — and the position worth paying for
 * is the next one the player has to find, which is exactly where they
 * are stuck. That includes a word's opening cell: knowing the letter is
 * a W says nothing about which of the eight neighbours it is.
 */

/**
 * The cell the next hint should reveal: the first un-hinted cell at or
 * after the player's progress. Cells behind progress are already shown
 * by the snake, so hinting one would spend a hint on nothing. Returns
 * null when nothing is left.
 */
export function nextHintIndex(
  pathLength: number,
  progress: number,
  hinted: ReadonlySet<number>,
): number | null {
  for (let i = progress; i < pathLength; i++) {
    if (!hinted.has(i)) return i;
  }
  return null;
}

/**
 * Rebuild the hinted set from a saved COUNT. Only the count is
 * persisted, so replay the same targeting rule against the restored
 * progress — that reproduces hints the player can still see, rather
 * than the first N cells of the phrase.
 */
export function replayHints(
  pathLength: number,
  progress: number,
  count: number,
): Set<number> {
  const hinted = new Set<number>();
  for (let n = 0; n < count; n++) {
    const idx = nextHintIndex(pathLength, progress, hinted);
    if (idx === null) break;
    hinted.add(idx);
  }
  return hinted;
}
