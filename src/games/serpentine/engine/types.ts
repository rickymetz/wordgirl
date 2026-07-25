export type Difficulty = "haiku" | "poem";

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
