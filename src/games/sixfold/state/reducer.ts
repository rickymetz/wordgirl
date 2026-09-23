import { cluedCells, hiddenCells, hintCell } from "../engine/hints";
import type { SixfoldPuzzle } from "../engine/types";
import { CELLS, N } from "../engine/types";

/** An empty cell in `entries`. */
export const BLANK = ".";

/** What a write placed — narrated for screen readers, and the toast. */
export type Feedback =
  | { type: "placed"; cell: number; letter: string; repeats: boolean; nonce: number }
  | { type: "cleared"; cell: number; nonce: number }
  | { type: "hint"; cell: number; nonce: number }
  /** A letter pressed on a given or hinted cell, which can't change. */
  | { type: "locked"; cell: number; nonce: number }
  /** Every cell filled, but not the solution. */
  | { type: "full"; nonce: number }
  | { type: "solved"; nonce: number };

export interface GameState {
  puzzle: SixfoldPuzzle;
  /** One char per cell, row-major: a letter or BLANK. Givens included. */
  entries: string;
  /** Cells a hint filled — locked like givens. */
  revealed: number[];
  selected: number | null;
  solved: boolean;
  hints: number;
  /** Placements that created a duplicate in a row/column/box (trends). */
  conflicts: number;
  feedback: Feedback | null;
}

export type Action =
  /** A tap: selects the cell, or deselects it when it already is. */
  | { type: "tapCell"; cell: number }
  /** Keyboard focus landed on a cell: select it (never toggles off). */
  | { type: "select"; cell: number }
  | { type: "pressLetter"; letter: string }
  | { type: "erase" }
  | { type: "move"; dRow: number; dCol: number }
  | { type: "revealHint" }
  | {
      type: "hydrate";
      entries: string;
      revealed: number[];
      solved: boolean;
      hints?: number;
      conflicts?: number;
    };

export function initialEntries(puzzle: SixfoldPuzzle): string {
  const out = Array<string>(CELLS).fill(BLANK);
  for (const c of puzzle.givens) out[c] = puzzle.solution[c];
  return out.join("");
}

export function initialState(puzzle: SixfoldPuzzle): GameState {
  return {
    puzzle,
    entries: initialEntries(puzzle),
    revealed: [],
    selected: null,
    solved: false,
    hints: 0,
    conflicts: 0,
    feedback: null,
  };
}

export function isLocked(state: Pick<GameState, "puzzle" | "revealed">, cell: number): boolean {
  return state.puzzle.givens.includes(cell) || state.revealed.includes(cell);
}

/** The row, column and region cells that share a unit with `cell`. */
export function peers(regions: readonly number[], cell: number): Set<number> {
  const r = Math.floor(cell / N);
  const c = cell % N;
  const out = new Set<number>();
  for (let i = 0; i < CELLS; i++) {
    if (Math.floor(i / N) === r || i % N === c || regions[i] === regions[cell]) {
      out.add(i);
    }
  }
  return out;
}

/** Cells whose letter repeats somewhere in one of their units. */
export function conflictCells(regions: readonly number[], entries: string): Set<number> {
  const out = new Set<number>();
  for (let a = 0; a < CELLS; a++) {
    const ch = entries[a];
    if (ch === BLANK) continue;
    for (const b of peers(regions, a)) {
      if (b !== a && entries[b] === ch) {
        out.add(a);
        break;
      }
    }
  }
  return out;
}

export type LineName = "clued" | "hidden";

/**
 * On a full board with no repeats that still isn't the solution, the
 * word lines that don't spell their word. (By strict uniqueness at least
 * one of them is wrong; naming it is the only way a player can find a
 * mistake the board doesn't otherwise show.)
 */
export function wrongLines(puzzle: SixfoldPuzzle, entries: string): LineName[] {
  if (entries.includes(BLANK) || entries === puzzle.solution) return [];
  if (conflictCells(puzzle.regions, entries).size > 0) return [];
  const spell = (cells: number[]) => cells.map((c) => entries[c]).join("");
  const out: LineName[] = [];
  if (spell(cluedCells(puzzle)) !== puzzle.cluedWord) out.push("clued");
  if (spell(hiddenCells(puzzle)) !== puzzle.hiddenWord) out.push("hidden");
  return out;
}

function nextNonce(state: GameState): number {
  return (state.feedback?.nonce ?? 0) + 1;
}

/** Write one cell and settle what the write means. */
function write(state: GameState, cell: number, letter: string): GameState {
  if (isLocked(state, cell)) {
    return letter === BLANK
      ? state
      : { ...state, feedback: { type: "locked", cell, nonce: nextNonce(state) } };
  }
  if (state.entries[cell] === letter) return state;
  const entries = state.entries.slice(0, cell) + letter + state.entries.slice(cell + 1);
  const repeats = letter !== BLANK && conflictCells(state.puzzle.regions, entries).has(cell);
  const nonce = nextNonce(state);
  return settle({
    ...state,
    entries,
    conflicts: state.conflicts + (repeats ? 1 : 0),
    feedback:
      letter === BLANK
        ? { type: "cleared", cell, nonce }
        : { type: "placed", cell, letter, repeats, nonce },
  });
}

/** A full board is either the solve or a "full" message — unless the
 *  write was a hint, whose own feedback is the more useful news. */
function settle(state: GameState, keepFeedback = false): GameState {
  if (state.entries.includes(BLANK)) return state;
  if (state.entries === state.puzzle.solution) {
    return {
      ...state,
      solved: true,
      selected: null,
      feedback: { type: "solved", nonce: nextNonce(state) },
    };
  }
  if (keepFeedback) return state;
  return { ...state, feedback: { type: "full", nonce: nextNonce(state) } };
}

export function gameReducer(state: GameState, action: Action): GameState {
  // The board is final once solved — the clock stopped there.
  if (state.solved && action.type !== "hydrate") return state;

  switch (action.type) {
    case "tapCell": {
      const { cell } = action;
      if (cell < 0 || cell >= CELLS) return state;
      return { ...state, selected: state.selected === cell ? null : cell };
    }
    case "select": {
      if (action.cell < 0 || action.cell >= CELLS || state.selected === action.cell) return state;
      return { ...state, selected: action.cell };
    }
    case "pressLetter": {
      const letter = action.letter.toLowerCase();
      if (!state.puzzle.letters.includes(letter) || state.selected === null) return state;
      return write(state, state.selected, letter);
    }
    case "erase": {
      if (state.selected === null) return state;
      return write(state, state.selected, BLANK);
    }
    case "move": {
      if (state.selected === null) return { ...state, selected: 0 };
      const r = (Math.floor(state.selected / N) + action.dRow + N) % N;
      const c = ((state.selected % N) + action.dCol + N) % N;
      return { ...state, selected: r * N + c };
    }
    case "revealHint": {
      // The next cell the player's own toolkit would deduce — a hint that
      // teaches the next move, not the first gap in reading order.
      const cell = hintCell(state.puzzle, state.entries);
      if (cell === null) return state;
      const entries =
        state.entries.slice(0, cell) + state.puzzle.solution[cell] + state.entries.slice(cell + 1);
      return settle(
        {
          ...state,
          entries,
          revealed: [...state.revealed, cell],
          hints: state.hints + 1,
          selected: cell,
          feedback: { type: "hint", cell, nonce: nextNonce(state) },
        },
        true,
      );
    }
    case "hydrate": {
      // A save that doesn't fit this puzzle (length, alphabet, or a given
      // overwritten) starts the day fresh — belt and braces behind the
      // puzzleKey check upstream.
      const { entries } = action;
      const letters = state.puzzle.letters + BLANK;
      if (
        entries.length !== CELLS ||
        [...entries].some((ch) => !letters.includes(ch)) ||
        state.puzzle.givens.some((c) => entries[c] !== state.puzzle.solution[c])
      ) {
        return state;
      }
      const revealed = action.revealed.filter((c) => Number.isInteger(c) && c >= 0 && c < CELLS);
      return {
        ...state,
        entries,
        revealed,
        solved: action.solved && entries === state.puzzle.solution,
        hints: action.hints ?? 0,
        conflicts: action.conflicts ?? 0,
        selected: null,
        feedback: null,
      };
    }
  }
}
