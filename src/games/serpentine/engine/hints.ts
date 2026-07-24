/**
 * Hint targeting. A hint reveals one cell of the solution path; the
 * player only benefits from cells their snake has not already reached,
 * so targeting is always relative to their progress.
 */

/** Path indices where each word of the phrase begins. */
export function wordStartIndices(text: string): number[] {
  const starts: number[] = [];
  let pathIndex = 0;
  let atWordStart = true;
  for (const ch of text) {
    if (ch === " ") {
      atWordStart = true;
      continue;
    }
    if (!/[A-Za-z]/.test(ch)) continue;
    if (atWordStart) {
      starts.push(pathIndex);
      atWordStart = false;
    }
    pathIndex++;
  }
  return starts;
}

/**
 * The cell the next hint should reveal: the first un-hinted word start
 * at or after the player's progress, else the next un-hinted cell.
 * Cells behind progress are already shown by the snake, so hinting one
 * would spend a hint on nothing. Returns null when nothing is left.
 */
export function nextHintIndex(
  wordStarts: readonly number[],
  pathLength: number,
  progress: number,
  hinted: ReadonlySet<number>,
): number | null {
  const start = wordStarts.find((i) => i >= progress && !hinted.has(i));
  if (start !== undefined) return start;
  for (let i = progress; i < pathLength; i++) {
    if (!hinted.has(i)) return i;
  }
  return null;
}

/**
 * Rebuild the hinted set from a saved COUNT. Only the count is
 * persisted, so replay the same targeting rule against the restored
 * progress — that reproduces hints the player can still see, rather
 * than the first N word starts of the phrase.
 */
export function replayHints(
  wordStarts: readonly number[],
  pathLength: number,
  progress: number,
  count: number,
): Set<number> {
  const hinted = new Set<number>();
  for (let n = 0; n < count; n++) {
    const idx = nextHintIndex(wordStarts, pathLength, progress, hinted);
    if (idx === null) break;
    hinted.add(idx);
  }
  return hinted;
}
