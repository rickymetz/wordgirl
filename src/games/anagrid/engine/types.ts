/**
 * Working id `anagrid` — the name is still open, and renaming is a
 * folder move plus the registry entry.
 *
 * A 6×6 letter sudoku over the six letters of an anagram family: every
 * row, column and region holds each letter once, one clued row spells
 * a family word and a second line — the main diagonal, or a crossing
 * column — spells another, hidden until solved. The daily rule is that
 * sudoku logic ALONE must not pin the grid down — the words have to do
 * some of the work.
 */

export const N = 6;
export const CELLS = N * N;

/** Cell index is row-major: `row * N + col`. */
export function cellIndex(row: number, col: number): number {
  return row * N + col;
}

export interface Layout {
  /** Stable id — seeds pick layouts by id, never by array position. */
  id: string;
  /** Region number (0..N-1) per cell, row-major. */
  regions: readonly number[];
}

export interface AnagridPuzzle {
  /** The family's six letters, sorted — the letter pad's order, so it spoils nothing. */
  letters: string;
  /** Every common-tier word in the family (the results card lists them). */
  family: readonly string[];
  /** The unclued word (main diagonal, or the down); revealed at the finish. */
  hiddenWord: string;
  /** The clued row's answer. */
  cluedWord: string;
  /** Which row is clued (0-based). */
  row: number;
  /** The down's column for a `cross` puzzle; -1 when the hidden word is the diagonal. */
  col: number;
  layoutId: string;
  regions: readonly number[];
  /** Solved grid, row-major, one letter per cell. */
  solution: string;
  /** Cells shown at the start. */
  givens: readonly number[];
}
