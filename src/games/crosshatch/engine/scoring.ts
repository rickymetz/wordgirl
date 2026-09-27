import type { Combo, CrosshatchPuzzle } from "./types";

/**
 * The unit of progress is the distinct WORD, not the full-grid combo:
 * submitting a valid grid banks every new word in it, so the player
 * never re-submits near-identical grids just to sweep a cross-product.
 */
export function uniqueWords(combos: readonly Combo[]): string[] {
  return [...new Set(combos.flat())].sort();
}

/** The words a puzzle lists — see `CrosshatchPuzzle.targets`. */
export function targetWords(puzzle: CrosshatchPuzzle): string[] {
  return puzzle.targets ?? uniqueWords(puzzle.combos);
}

export function isSolved(found: number, total: number): boolean {
  return total > 0 && found >= total;
}
