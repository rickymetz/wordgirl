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

/**
 * The hold-to-finish gate: list finds plus bonus finds cover the list,
 * one for one, while some of the list is still unfound (the whole list
 * solves on its own). Finishing reveals the unfound list words as missed.
 */
export function canFinishEarly(found: number, bonus: number, total: number): boolean {
  return total > 0 && found < total && bonus > 0 && found + bonus >= total;
}
