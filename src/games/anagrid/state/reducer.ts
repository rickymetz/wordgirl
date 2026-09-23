import type { AnagridPuzzle } from "../engine/types";
import { CELLS, N } from "../engine/types";

/** An empty cell in `entries`. */
export const BLANK = ".";

/**
 * cell: tap a cell, then a letter. letter: pick a letter (or the
 * eraser), then stamp it into cells. Same board, two orders of taps.
 */
export type EntryMode = "cell" | "letter";

/** The letter-first tool: a letter, or the eraser. */
export type Tool = string | typeof ERASER;
export const ERASER = "erase";

export type Feedback =
  | { type: "hint"; cell: number; nonce: number }
  /** Every cell filled, but not the solution — a word line isn't a word. */
  | { type: "full"; nonce: number }
  | { type: "solved"; nonce: number };

export interface GameState {
  puzzle: AnagridPuzzle;
  /** One char per cell, row-major: a letter or BLANK. Givens included. */
  entries: string;
  /** Cells a hint filled — locked like givens. */
  revealed: number[];
  selected: number | null;
  mode: EntryMode;
  tool: Tool | null;
  solved: boolean;
  hints: number;
  /** Placements that created a duplicate in a row/column/box (trends). */
  conflicts: number;
  feedback: Feedback | null;
}

export type Action =
  | { type: "tapCell"; cell: number }
  | { type: "pressLetter"; letter: string }
  | { type: "erase" }
  | { type: "setMode"; mode: EntryMode }
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

export function initialEntries(puzzle: AnagridPuzzle): string {
  const out = Array<string>(CELLS).fill(BLANK);
  for (const c of puzzle.givens) out[c] = puzzle.solution[c];
  return out.join("");
}

export function initialState(puzzle: AnagridPuzzle): GameState {
  return {
    puzzle,
    entries: initialEntries(puzzle),
    revealed: [],
    selected: null,
    mode: "cell",
    tool: null,
    solved: false,
    hints: 0,
    conflicts: 0,
    feedback: null,
  };
}

export function isLocked(state: GameState, cell: number): boolean {
  return state.puzzle.givens.includes(cell) || state.revealed.includes(cell);
}

/** The row, column and region cells that share a unit with `cell`. */
export function peers(regions: readonly number[], cell: number): Set<number> {
  const r = Math.floor(cell / N);
  const c = cell % N;
  const out = new Set<number>();
  for (let i = 0; i < CELLS; i++) {
    if (
      Math.floor(i / N) === r ||
      i % N === c ||
      regions[i] === regions[cell]
    ) {
      out.add(i);
    }
  }
  return out;
}

/** Cells whose letter repeats somewhere in one of their units. */
export function conflictCells(
  regions: readonly number[],
  entries: string,
): Set<number> {
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

function nextNonce(state: GameState): number {
  return (state.feedback?.nonce ?? 0) + 1;
}

/** Write one cell and settle what the write means. */
function write(state: GameState, cell: number, letter: string): GameState {
  if (isLocked(state, cell) || state.entries[cell] === letter) return state;
  const entries =
    state.entries.slice(0, cell) + letter + state.entries.slice(cell + 1);
  const createsConflict =
    letter !== BLANK &&
    conflictCells(state.puzzle.regions, entries).has(cell);
  const next: GameState = {
    ...state,
    entries,
    conflicts: state.conflicts + (createsConflict ? 1 : 0),
  };
  return settle(next);
}

function settle(state: GameState): GameState {
  if (state.entries.includes(BLANK)) return state;
  if (state.entries === state.puzzle.solution) {
    return {
      ...state,
      solved: true,
      selected: null,
      tool: null,
      feedback: { type: "solved", nonce: nextNonce(state) },
    };
  }
  return { ...state, feedback: { type: "full", nonce: nextNonce(state) } };
}

export function gameReducer(state: GameState, action: Action): GameState {
  // The board is final once solved — the clock stopped there.
  if (state.solved && action.type !== "hydrate") return state;

  switch (action.type) {
    case "tapCell": {
      const { cell } = action;
      if (cell < 0 || cell >= CELLS) return state;
      if (state.mode === "letter" && state.tool !== null) {
        const letter = state.tool === ERASER ? BLANK : state.tool;
        // Tapping a cell that already holds the tool's letter clears it,
        // so a mis-stamp is undone by the same tap.
        const target =
          letter !== BLANK && state.entries[cell] === letter ? BLANK : letter;
        return write({ ...state, selected: cell }, cell, target);
      }
      return { ...state, selected: state.selected === cell ? null : cell };
    }
    case "pressLetter": {
      const letter = action.letter.toLowerCase();
      if (!state.puzzle.letters.includes(letter)) return state;
      if (state.mode === "letter") {
        return { ...state, tool: state.tool === letter ? null : letter };
      }
      if (state.selected === null) return state;
      return write(state, state.selected, letter);
    }
    case "erase": {
      if (state.mode === "letter") {
        return { ...state, tool: state.tool === ERASER ? null : ERASER };
      }
      if (state.selected === null) return state;
      return write(state, state.selected, BLANK);
    }
    case "setMode": {
      if (state.mode === action.mode) return state;
      return { ...state, mode: action.mode, tool: null };
    }
    case "move": {
      const from = state.selected ?? 0;
      const r = (Math.floor(from / N) + action.dRow + N) % N;
      const c = ((from % N) + action.dCol + N) % N;
      return { ...state, selected: state.selected === null ? 0 : r * N + c };
    }
    case "revealHint": {
      const wrong = (c: number) =>
        !isLocked(state, c) && state.entries[c] !== state.puzzle.solution[c];
      // The selected cell if it needs help, else the first that does.
      let cell =
        state.selected !== null && wrong(state.selected) ? state.selected : -1;
      if (cell < 0) {
        for (let c = 0; c < CELLS; c++) {
          if (wrong(c)) {
            cell = c;
            break;
          }
        }
      }
      if (cell < 0) return state;
      const entries =
        state.entries.slice(0, cell) +
        state.puzzle.solution[cell] +
        state.entries.slice(cell + 1);
      const next: GameState = {
        ...state,
        entries,
        revealed: [...state.revealed, cell],
        hints: state.hints + 1,
        selected: cell,
        feedback: { type: "hint", cell, nonce: nextNonce(state) },
      };
      return settle(next);
    }
    case "hydrate": {
      // A save that doesn't fit this puzzle (length, alphabet, or a
      // given overwritten) starts the day fresh — belt and braces
      // behind the puzzleKey check upstream.
      const { entries } = action;
      const letters = state.puzzle.letters + BLANK;
      if (
        entries.length !== CELLS ||
        [...entries].some((ch) => !letters.includes(ch)) ||
        state.puzzle.givens.some((c) => entries[c] !== state.puzzle.solution[c])
      ) {
        return state;
      }
      const revealed = action.revealed.filter(
        (c) => Number.isInteger(c) && c >= 0 && c < CELLS,
      );
      return {
        ...state,
        entries,
        revealed,
        solved: action.solved && entries === state.puzzle.solution,
        hints: action.hints ?? 0,
        conflicts: action.conflicts ?? 0,
        selected: null,
        tool: null,
        feedback: null,
      };
    }
  }
}
