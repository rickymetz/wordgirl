import {
  areAdjacent,
  cellKey,
  cellsEqual,
  type Cell,
  type Difficulty,
  type PuzzleDef,
} from "../engine/types";
import { checkSolved, findMatchingSnake } from "../engine/validation";

export interface SnakeProgress {
  cells: Cell[];
  /** Index of the matched solution snake, or -1. */
  matchedSnake: number;
}

export interface GameState {
  puzzle: PuzzleDef;
  difficulty: Difficulty;
  paths: SnakeProgress[];
  activeSnake: number;
  solved: boolean;
  /** Per-path set of claimed cell keys, for fast lookups. */
  claimed: Set<string>;
}

export type Action =
  | { type: "tapCell"; row: number; col: number }
  | { type: "undo" }
  | { type: "clearSnake" }
  | { type: "switchSnake"; index: number }
  | { type: "hydrate"; paths: Cell[][]; activeSnake: number; solved: boolean };

function buildClaimed(paths: SnakeProgress[]): Set<string> {
  const set = new Set<string>();
  for (const p of paths) {
    for (const c of p.cells) set.add(cellKey(c));
  }
  return set;
}

function recheckMatches(
  paths: SnakeProgress[],
  puzzle: PuzzleDef,
): SnakeProgress[] {
  const rawPaths = paths.map((p) => p.cells);
  const { solved, matches } = checkSolved(rawPaths, puzzle);

  if (solved) {
    return paths.map((p, i) => ({ ...p, matchedSnake: matches[i] }));
  }

  // Check individual paths against available solution snakes.
  const taken = new Set<number>();
  const result: SnakeProgress[] = [];
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    if (p.cells.length !== puzzle.snakes.find((_, si) => !taken.has(si))?.cells.length) {
      // Only check paths that are the right length for some unmatched snake.
      const match = findMatchingSnake(
        p.cells,
        puzzle.snakes,
        taken,
      );
      if (match >= 0) taken.add(match);
      result.push({ ...p, matchedSnake: match });
    } else {
      const match = findMatchingSnake(p.cells, puzzle.snakes, taken);
      if (match >= 0) taken.add(match);
      result.push({ ...p, matchedSnake: match });
    }
  }
  return result;
}

export function initialState(
  puzzle: PuzzleDef,
  difficulty: Difficulty,
): GameState {
  const paths = puzzle.snakes.map((): SnakeProgress => ({
    cells: [],
    matchedSnake: -1,
  }));
  return {
    puzzle,
    difficulty,
    paths,
    activeSnake: 0,
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
    case "switchSnake":
      return handleSwitchSnake(state, action.index);
    case "hydrate":
      return handleHydrate(state, action);
    default:
      return state;
  }
}

function handleTapCell(state: GameState, cell: Cell): GameState {
  if (state.solved) return state;

  const active = state.paths[state.activeSnake];
  const targetLen = state.puzzle.snakes[state.activeSnake].cells.length;
  const key = cellKey(cell);

  // Tap the tail -> undo one step.
  if (
    active.cells.length > 0 &&
    cellsEqual(active.cells[active.cells.length - 1], cell)
  ) {
    return handleUndo(state);
  }

  // Tap earlier in active path -> truncate to that point.
  const idx = active.cells.findIndex((c) => cellsEqual(c, cell));
  if (idx >= 0) {
    const newCells = active.cells.slice(0, idx + 1);
    return applyPathUpdate(state, newCells);
  }

  // Cell is in another snake's path -> switch to it.
  if (state.claimed.has(key)) {
    for (let i = 0; i < state.paths.length; i++) {
      if (i === state.activeSnake) continue;
      if (state.paths[i].cells.some((c) => cellsEqual(c, cell))) {
        return { ...state, activeSnake: i };
      }
    }
    return state;
  }

  // Path is at target length -> can't extend further.
  if (active.cells.length >= targetLen) return state;

  // Empty path -> start here.
  if (active.cells.length === 0) {
    return applyPathUpdate(state, [cell]);
  }

  // Adjacent to tail -> extend.
  const tail = active.cells[active.cells.length - 1];
  if (areAdjacent(tail, cell)) {
    return applyPathUpdate(state, [...active.cells, cell]);
  }

  return state;
}

function handleUndo(state: GameState): GameState {
  if (state.solved) return state;
  const active = state.paths[state.activeSnake];
  if (active.cells.length === 0) return state;
  return applyPathUpdate(state, active.cells.slice(0, -1));
}

function handleClearSnake(state: GameState): GameState {
  if (state.solved) return state;
  return applyPathUpdate(state, []);
}

function handleSwitchSnake(state: GameState, index: number): GameState {
  if (index < 0 || index >= state.paths.length) return state;
  return { ...state, activeSnake: index };
}

function handleHydrate(
  state: GameState,
  action: { paths: Cell[][]; activeSnake: number; solved: boolean },
): GameState {
  const paths = state.puzzle.snakes.map((_, i): SnakeProgress => ({
    cells: action.paths[i] ?? [],
    matchedSnake: -1,
  }));
  const checked = recheckMatches(paths, state.puzzle);
  return {
    ...state,
    paths: checked,
    activeSnake: action.activeSnake,
    solved: action.solved,
    claimed: buildClaimed(checked),
  };
}

function applyPathUpdate(state: GameState, newCells: Cell[]): GameState {
  const newPaths = state.paths.map((p, i) =>
    i === state.activeSnake ? { ...p, cells: newCells, matchedSnake: -1 } : p,
  );
  const checked = recheckMatches(newPaths, state.puzzle);
  const rawPaths = checked.map((p) => p.cells);
  const { solved } = checkSolved(rawPaths, state.puzzle);

  // Auto-advance to the next empty snake if current is full.
  let activeSnake = state.activeSnake;
  const targetLen = state.puzzle.snakes[state.activeSnake].cells.length;
  if (newCells.length >= targetLen && !solved) {
    for (let i = 0; i < checked.length; i++) {
      if (checked[i].cells.length === 0) {
        activeSnake = i;
        break;
      }
    }
  }

  return {
    ...state,
    paths: checked,
    activeSnake,
    solved,
    claimed: buildClaimed(checked),
  };
}
