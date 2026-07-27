import {
  areAdjacent,
  cellKey,
  MAX_COLS,
  MAX_ROWS,
  stepKey,
  straddledCells,
  type Cell,
  type PuzzleDef,
} from "./types";

/** True when every consecutive pair in `path` is 8-directionally adjacent. */
export function isContiguousPath(path: Cell[]): boolean {
  for (let i = 1; i < path.length; i++) {
    if (!areAdjacent(path[i - 1], path[i])) return false;
  }
  return true;
}

/**
 * The index of the first step that crosses an earlier one, or -1 when the
 * line never crosses itself.
 *
 * A snake does not pass through its own body, so neither does a
 * Serpentine solution: it may run alongside itself, but the two arms of a
 * 2×2 block's X may not both be drawn. Cell reuse is caught elsewhere
 * (`checkSolved`, `validatePuzzle`); the only crossing left once every
 * cell is visited once is that X, so a step is judged against the segment
 * between the cells it straddles.
 */
export function crossingStepIndex(path: readonly Cell[]): number {
  const steps = new Set<string>();
  for (let i = 1; i < path.length; i++) {
    const straddled = straddledCells(path[i - 1], path[i]);
    if (straddled && steps.has(stepKey(straddled[0], straddled[1]))) return i;
    steps.add(stepKey(path[i - 1], path[i]));
  }
  return -1;
}

/** True when the line crosses itself. See `crossingStepIndex`. */
export function pathSelfCrosses(path: readonly Cell[]): boolean {
  return crossingStepIndex(path) >= 0;
}

/**
 * True when every cell is a live cell of THIS puzzle's grid.
 *
 * A save records raw coordinates, and a puzzle's grid can be reshaped by
 * a later build — correcting a phrase's letter count re-runs `bestGrid`,
 * which turned one 6×7 board into a 5×8. Replaying such a save would
 * read past the end of the grid, so hydration drops it instead.
 */
export function cellsFitPuzzle(cells: readonly Cell[], puzzle: PuzzleDef): boolean {
  return cells.every(
    (c) =>
      c.row >= 0 &&
      c.row < puzzle.rows &&
      c.col >= 0 &&
      c.col < puzzle.cols &&
      !puzzle.blocked.has(cellKey(c)),
  );
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
  const unique = new Set(path.map(cellKey));
  if (unique.size !== path.length) return false;
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

  const crossing = crossingStepIndex(puzzle.path);
  if (crossing >= 0) {
    return `Path crosses itself at ${cellKey(puzzle.path[crossing - 1])} → ${cellKey(puzzle.path[crossing])}`;
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
