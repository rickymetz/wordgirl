import {
  areAdjacent,
  cellKey,
  cellsEqual,
  type Cell,
  type Difficulty,
  type PuzzleDef,
} from "../engine/types";
import { checkSolved } from "../engine/validation";

export interface GameState {
  puzzle: PuzzleDef;
  difficulty: Difficulty;
  cells: Cell[];
  matched: boolean;
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

export function initialState(
  puzzle: PuzzleDef,
  difficulty: Difficulty,
): GameState {
  return {
    puzzle,
    difficulty,
    cells: [],
    matched: false,
    solved: false,
    claimed: new Set(),
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

  // Tap earlier in path -> truncate to that point.
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

  // Empty path -> start here.
  if (cells.length === 0) {
    return applyPathUpdate(state, [cell]);
  }

  // Adjacent to tail -> extend.
  const tail = cells[cells.length - 1];
  if (areAdjacent(tail, cell)) {
    return applyPathUpdate(state, [...cells, cell]);
  }

  return state;
}

function handleUndo(state: GameState): GameState {
  if (state.solved) return state;
  if (state.cells.length === 0) return state;
  return applyPathUpdate(state, state.cells.slice(0, -1));
}

function handleClearSnake(state: GameState): GameState {
  if (state.solved) return state;
  return applyPathUpdate(state, []);
}

function handleHydrate(
  state: GameState,
  action: { cells: Cell[]; solved: boolean },
): GameState {
  const solved = action.solved && checkSolved(action.cells, state.puzzle);
  return {
    ...state,
    cells: action.cells,
    matched: solved,
    solved,
    claimed: buildClaimed(action.cells),
  };
}

function applyPathUpdate(state: GameState, newCells: Cell[]): GameState {
  const solved = checkSolved(newCells, state.puzzle);
  return {
    ...state,
    cells: newCells,
    matched: solved,
    solved,
    claimed: buildClaimed(newCells),
  };
}
