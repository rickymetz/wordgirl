import type { Combo } from "./types";

/**
 * A day counts as SOLVED at this percentage.
 * 100% is the flex above it, so one elusive word never breaks a streak.
 */
export const SOLVE_PCT = 90;

/**
 * The unit of progress is the distinct WORD, not the full-grid combo:
 * submitting a valid grid banks every new word in it, so the player
 * never re-submits near-identical grids just to sweep a cross-product.
 */
export function uniqueWords(combos: readonly Combo[]): string[] {
  return [...new Set(combos.flat())].sort();
}

/**
 * Words needed to mark the day solved: 90%, but always at least two
 * words of slack — plain ceil made "90%" mean "all but one" on every
 * 10-19-word day.
 */
export function solveTarget(total: number): number {
  return Math.max(1, Math.min(Math.ceil((total * SOLVE_PCT) / 100), total - 2));
}

export function isSolved(found: number, total: number): boolean {
  return total > 0 && found >= solveTarget(total);
}
