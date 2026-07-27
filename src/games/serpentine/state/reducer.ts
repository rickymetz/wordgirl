import {
  areAdjacent,
  cellKey,
  cellsEqual,
  stepKey,
  straddledCells,
  type Cell,
  type Difficulty,
  type PuzzleDef,
} from "../engine/types";
import { checkSolved } from "../engine/validation";

export interface GameState {
  puzzle: PuzzleDef;
  difficulty: Difficulty;
  cells: Cell[];
  solved: boolean;
  claimed: Set<string>;
}

export type Action =
  | { type: "tapCell"; row: number; col: number }
  | { type: "undo" }
  | { type: "clearSnake" }
  | { type: "hydrate"; cells: Cell[]; solved: boolean };

function buildClaimed(cells: Cell[]): Set<string> {
  return new Set(cells.map(cellKey));
}

/**
 * The start state: the phrase's first letter is GIVEN, so every puzzle
 * opens with the snake already one cell long, on `path[0]`.
 *
 * It is a floor, not a move — undo and clear stop here, and hint
 * targeting starts from it (progress is 1, so the first letter can
 * never be spent on). The board is the only place a player can be told
 * where the line begins; without it the opening move is a guess among
 * every cell in the grid.
 */
export function startCells(puzzle: PuzzleDef): Cell[] {
  return puzzle.path.length > 0 ? [puzzle.path[0]] : [];
}

/** True when the snake is untouched — still exactly the given letter. */
export function isStartState(state: GameState): boolean {
  return state.cells.length <= startCells(state.puzzle).length;
}

export function initialState(
  puzzle: PuzzleDef,
  difficulty: Difficulty,
): GameState {
  const cells = startCells(puzzle);
  return {
    puzzle,
    difficulty,
    cells,
    solved: false,
    claimed: buildClaimed(cells),
  };
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "tapCell":
      return handleTapCell(state, { row: action.row, col: action.col });
    case "undo":
      return handleUndo(state);
    case "clearSnake":
      return handleClearSnake(state);
    case "hydrate":
      return handleHydrate(state, action);
    default:
      return state;
  }
}

function handleTapCell(state: GameState, cell: Cell): GameState {
  if (state.solved) return state;

  const { cells, puzzle } = state;
  const targetLen = puzzle.path.length;
  const key = cellKey(cell);

  // Tap the tail -> undo one step.
  if (cells.length > 0 && cellsEqual(cells[cells.length - 1], cell)) {
    return handleUndo(state);
  }

  // Tap earlier in path -> truncate to that point. Index 0 is the given
  // letter, so the shortest this can leave is the start state.
  const idx = cells.findIndex((c) => cellsEqual(c, cell));
  if (idx >= 0) {
    return applyPathUpdate(state, cells.slice(0, idx + 1));
  }

  // Cell is blocked -> ignore.
  if (puzzle.blocked.has(key)) return state;

  // Cell already claimed -> ignore.
  if (state.claimed.has(key)) return state;

  // Path is at target length -> can't extend further.
  if (cells.length >= targetLen) return state;

  // Empty path -> start here. Only reachable for a pathless puzzle,
  // where there is no given letter to open from.
  if (cells.length === 0) {
    return applyPathUpdate(state, [cell]);
  }

  // Adjacent to tail -> extend, unless the step would cut through the
  // line already drawn.
  const tail = cells[cells.length - 1];
  if (areAdjacent(tail, cell) && !crossesSnake(cells, tail, cell)) {
    return applyPathUpdate(state, [...cells, cell]);
  }

  return state;
}

/**
 * True when stepping tail → cell would cross the drawn line.
 *
 * A snake does not pass through its own body: the two arms of a 2×2
 * block's X may not both be drawn (see `crossingStepIndex`). Generated
 * solutions never cross, so this refuses only moves that were wrong
 * anyway — and it makes a diagonal blocked by the line feel like a wall
 * mid-drag rather than a trap discovered at the end.
 */
function crossesSnake(cells: readonly Cell[], tail: Cell, cell: Cell): boolean {
  const straddled = straddledCells(tail, cell);
  if (!straddled) return false;
  const key = stepKey(straddled[0], straddled[1]);
  for (let i = 1; i < cells.length; i++) {
    if (stepKey(cells[i - 1], cells[i]) === key) return true;
  }
  return false;
}

function handleUndo(state: GameState): GameState {
  if (state.solved) return state;
  // Undo stops at the given letter rather than emptying the board.
  if (isStartState(state)) return state;
  return applyPathUpdate(state, state.cells.slice(0, -1));
}

function handleClearSnake(state: GameState): GameState {
  if (state.solved) return state;
  return applyPathUpdate(state, startCells(state.puzzle));
}

/**
 * A save records raw coordinates and predates the given first letter, so
 * it can hold a trace that starts somewhere else entirely. Replaying one
 * would strand the player: undo floors at cell one, and cell one would be
 * a cell the puzzle never gives. Such a save restarts from the given
 * letter instead.
 */
function normalizeCells(cells: Cell[], puzzle: PuzzleDef): Cell[] {
  const start = startCells(puzzle);
  if (start.length === 0) return cells;
  if (cells.length === 0) return start;
  return cellsEqual(cells[0], start[0]) ? cells : start;
}

function handleHydrate(
  state: GameState,
  action: { cells: Cell[]; solved: boolean },
): GameState {
  const cells = normalizeCells(action.cells, state.puzzle);
  const solved = checkSolved(cells, state.puzzle);
  return {
    ...state,
    cells,
    solved,
    claimed: buildClaimed(cells),
  };
}

function applyPathUpdate(state: GameState, newCells: Cell[]): GameState {
  const solved = checkSolved(newCells, state.puzzle);
  return {
    ...state,
    cells: newCells,
    solved,
    claimed: buildClaimed(newCells),
  };
}
