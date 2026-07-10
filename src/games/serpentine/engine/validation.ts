import { areAdjacent, cellKey, type Cell, type PuzzleDef, type SnakeDef } from "./types";

/** True when every consecutive pair in `path` is 8-directionally adjacent. */
export function isContiguousPath(path: Cell[]): boolean {
  for (let i = 1; i < path.length; i++) {
    if (!areAdjacent(path[i - 1], path[i])) return false;
  }
  return true;
}

/** Check if a player's path cells match a solution snake's cells (order-independent). */
function pathMatchesSnake(path: Cell[], snake: SnakeDef): boolean {
  if (path.length !== snake.cells.length) return false;
  const pathSet = new Set(path.map(cellKey));
  for (const c of snake.cells) {
    if (!pathSet.has(cellKey(c))) return false;
  }
  return true;
}

/**
 * Which solution snake index does a player path match?
 * Returns -1 if no match. `taken` is a set of already-matched snake indices.
 */
export function findMatchingSnake(
  path: Cell[],
  snakes: SnakeDef[],
  taken: Set<number>,
): number {
  for (let i = 0; i < snakes.length; i++) {
    if (taken.has(i)) continue;
    if (pathMatchesSnake(path, snakes[i])) return i;
  }
  return -1;
}

/**
 * Check if the puzzle is fully solved: every player path matches
 * a distinct solution snake, and all grid cells are covered.
 */
export function checkSolved(
  paths: Cell[][],
  puzzle: PuzzleDef,
): { solved: boolean; matches: number[] } {
  const matches: number[] = new Array(paths.length).fill(-1);
  const taken = new Set<number>();

  for (let i = 0; i < paths.length; i++) {
    if (paths[i].length === 0) return { solved: false, matches };
    if (!isContiguousPath(paths[i])) return { solved: false, matches };
    const match = findMatchingSnake(paths[i], puzzle.snakes, taken);
    matches[i] = match;
    if (match >= 0) taken.add(match);
  }

  const solved = taken.size === puzzle.snakes.length;
  return { solved, matches };
}

/** Check a single path against available solution snakes. */
export function checkSinglePath(
  path: Cell[],
  puzzle: PuzzleDef,
  otherPaths: Cell[][],
): number {
  const taken = new Set<number>();
  for (const other of otherPaths) {
    const m = findMatchingSnake(other, puzzle.snakes, taken);
    if (m >= 0) taken.add(m);
  }
  return findMatchingSnake(path, puzzle.snakes, taken);
}

/** Validate a puzzle definition (for tests): paths are contiguous,
 *  non-overlapping, and cover every cell exactly once. */
export function validatePuzzle(puzzle: PuzzleDef): string | null {
  const totalCells = puzzle.rows * puzzle.cols;
  const allCells = new Set<string>();
  let cellCount = 0;

  for (let i = 0; i < puzzle.snakes.length; i++) {
    const snake = puzzle.snakes[i];
    if (!isContiguousPath(snake.cells)) {
      return `Snake ${i} path is not contiguous`;
    }
    for (const c of snake.cells) {
      const key = cellKey(c);
      if (allCells.has(key)) return `Duplicate cell ${key} in snake ${i}`;
      allCells.add(key);
      cellCount++;
      if (c.row < 0 || c.row >= puzzle.rows || c.col < 0 || c.col >= puzzle.cols) {
        return `Cell ${key} out of bounds in snake ${i}`;
      }
    }
    const letters = snake.cells.map(c => puzzle.grid[c.row][c.col]).join("");
    const expected = snake.text.replace(/\s/g, "");
    if (letters !== expected) {
      return `Snake ${i} text mismatch: got "${letters}", expected "${expected}"`;
    }
  }

  if (cellCount !== totalCells) {
    return `Snakes cover ${cellCount} cells, grid has ${totalCells}`;
  }
  return null;
}
