import { areAdjacent, cellKey, type Cell, type PuzzleDef } from "./types";

/** True when every consecutive pair in `path` is 8-directionally adjacent. */
export function isContiguousPath(path: Cell[]): boolean {
  for (let i = 1; i < path.length; i++) {
    if (!areAdjacent(path[i - 1], path[i])) return false;
  }
  return true;
}

/** Check if a player's path cells match the solution path cells (order-independent). */
function pathMatchesSolution(path: Cell[], solution: Cell[]): boolean {
  if (path.length !== solution.length) return false;
  const pathSet = new Set(path.map(cellKey));
  for (const c of solution) {
    if (!pathSet.has(cellKey(c))) return false;
  }
  return true;
}

/**
 * Check if the puzzle is fully solved: player path matches
 * the solution path and all grid cells are covered.
 */
export function checkSolved(
  path: Cell[],
  puzzle: PuzzleDef,
): boolean {
  if (path.length === 0) return false;
  if (!isContiguousPath(path)) return false;
  return pathMatchesSolution(path, puzzle.path);
}

/** Validate a puzzle definition (for tests): path is contiguous,
 *  covers every cell exactly once, and text matches. */
export function validatePuzzle(puzzle: PuzzleDef): string | null {
  const totalCells = puzzle.rows * puzzle.cols;

  if (!isContiguousPath(puzzle.path)) {
    return "Path is not contiguous";
  }

  const allCells = new Set<string>();
  for (const c of puzzle.path) {
    const key = cellKey(c);
    if (allCells.has(key)) return `Duplicate cell ${key}`;
    allCells.add(key);
    if (c.row < 0 || c.row >= puzzle.rows || c.col < 0 || c.col >= puzzle.cols) {
      return `Cell ${key} out of bounds`;
    }
  }

  if (puzzle.path.length !== totalCells) {
    return `Path covers ${puzzle.path.length} cells, grid has ${totalCells}`;
  }

  const letters = puzzle.path.map(c => puzzle.grid[c.row][c.col]).join("");
  const expected = puzzle.text.replace(/\s/g, "");
  if (letters !== expected) {
    return `Text mismatch: got "${letters}", expected "${expected}"`;
  }

  return null;
}
