export type Difficulty = "haiku" | "poem";

/** The two boards a day carries, in board order. */
export const DIFFICULTIES: Difficulty[] = ["haiku", "poem"];

export const MAX_ROWS = 8;
export const MAX_COLS = 10;

export interface Cell {
  row: number;
  col: number;
}

export interface PuzzleDef {
  id: string;
  title: string;
  author: string;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  /** grid[row][col] = uppercase letter (empty string for blocked cells). */
  grid: string[][];
  /**
   * The hidden phrase. Spaces mark word boundaries; every other
   * non-letter is punctuation the readout draws where it stands
   * (APPLE-TREE, O'ER). All of it is display-only — only the A–Z
   * letters map to grid cells, in order.
   */
  text: string;
  /**
   * True when the phrase is part of a longer poem rather than the whole
   * of it — the readout says "from" before the title.
   */
  excerpt: boolean;
  /**
   * True when the title would give the phrase away, so it must not be
   * shown as the clue. See `titleSpoilsPhrase`.
   */
  titleSpoils: boolean;
  /** Ordered solution path through the grid. */
  path: Cell[];
  /** Cells removed from the grid to fit non-rectangular letter counts. */
  blocked: Set<string>;
}

export function cellKey(c: Cell): string {
  return `${c.row},${c.col}`;
}

export function cellsEqual(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

export function areAdjacent(a: Cell, b: Cell): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr <= 1 && dc <= 1 && (dr + dc > 0);
}

/** Order-independent key for the segment drawn between two cells. */
export function stepKey(a: Cell, b: Cell): string {
  const ka = cellKey(a);
  const kb = cellKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

/**
 * The two cells a diagonal step passes BETWEEN — the other diagonal of
 * its 2×2 block — or null when the step is orthogonal.
 *
 * Only diagonals can cross: two orthogonal steps meet at a cell centre
 * at most, and a cell is visited once. So the one way the line can cross
 * itself is the X of a 2×2 block, and this names the other arm of it.
 */
export function straddledCells(a: Cell, b: Cell): [Cell, Cell] | null {
  if (a.row === b.row || a.col === b.col) return null;
  return [
    { row: a.row, col: b.col },
    { row: b.row, col: a.col },
  ];
}
