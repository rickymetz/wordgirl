export type Difficulty = "easy" | "medium" | "hard";

export interface Cell {
  row: number;
  col: number;
}

export interface PuzzleDef {
  id: string;
  title: string;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  /** grid[row][col] = uppercase letter. */
  grid: string[][];
  /** The hidden phrase — spaces mark word boundaries for display. */
  text: string;
  /** Ordered solution path through the grid. */
  path: Cell[];
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
