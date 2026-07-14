import { areAdjacent, cellKey, MAX_COLS, MAX_ROWS, type Cell, type PuzzleDef } from "./types";

/** True when every consecutive pair in `path` is 8-directionally adjacent. */
export function isContiguousPath(path: Cell[]): boolean {
  for (let i = 1; i < path.length; i++) {
    if (!areAdjacent(path[i - 1], path[i])) return false;
  }
  return true;
}

function pathSpellsText(path: Cell[], puzzle: PuzzleDef): boolean {
  const expected = puzzle.text.replace(/[^A-Z]/g, "");
  if (path.length !== expected.length) return false;
  for (let i = 0; i < path.length; i++) {
    if (puzzle.grid[path[i].row][path[i].col] !== expected[i]) return false;
  }
  return true;
}

/**
 * Check if the puzzle is fully solved: player path is contiguous,
 * covers all live cells, and spells the expected text.
 */
export function checkSolved(
  path: Cell[],
  puzzle: PuzzleDef,
): boolean {
  if (path.length === 0) return false;
  if (!isContiguousPath(path)) return false;
  return pathSpellsText(path, puzzle);
}

/** Validate a puzzle definition (for tests): path is contiguous,
 *  covers every cell exactly once, and text matches. */
export function validatePuzzle(puzzle: PuzzleDef): string | null {
  if (puzzle.rows > MAX_ROWS || puzzle.cols > MAX_COLS) {
    return `Grid ${puzzle.rows}×${puzzle.cols} exceeds max ${MAX_ROWS}×${MAX_COLS}`;
  }

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

  const liveCells = totalCells - puzzle.blocked.size;
  if (puzzle.path.length !== liveCells) {
    return `Path covers ${puzzle.path.length} cells, grid has ${liveCells} live (${puzzle.blocked.size} blocked)`;
  }

  for (const c of puzzle.path) {
    if (puzzle.blocked.has(cellKey(c))) {
      return `Path visits blocked cell ${cellKey(c)}`;
    }
  }

  const letters = puzzle.path.map(c => puzzle.grid[c.row][c.col]).join("");
  const expected = puzzle.text.replace(/[^A-Z]/g, "");
  if (letters !== expected) {
    return `Text mismatch: got "${letters}", expected "${expected}"`;
  }

  return null;
}
