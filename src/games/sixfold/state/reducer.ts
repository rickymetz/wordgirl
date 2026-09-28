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
  /** Every cell filled, but not a solve (see `isSolvedBoard`). */
  | { type: "full"; nonce: number }
  /** A letter or erase with no cell selected: nothing to write into. */
  | { type: "noCell"; nonce: number }
  | { type: "solved"; nonce: number };

export interface GameState {
  puzzle: SixfoldPuzzle;
  /** One char per cell, row-major: a letter or BLANK. Givens included. */
  entries: string;
  /** Cells a hint filled — locked like givens. */
  revealed: number[];
  selected: number | null;
  /** Which line the selection travels along — crossword across/down.
   *  Not saved: a fresh visit starts across. */
  dir: Dir;
  /** The square auto-advance just left, so a backspace on the (empty)
   *  square it moved to undoes that letter. Cleared by any other move. */
  advancedFrom: number | null;
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
  /** The next (1) or previous (-1) line in LINES order. */
  | { type: "stepLine"; delta: 1 | -1 }
  | { type: "revealHint" }
  | {
      type: "hydrate";
      entries: string;
      revealed: number[];
      solved: boolean;
      hints?: number;
      conflicts?: number;
    };

export type Dir = "across" | "down";

/** A row (across) or column (down) the selection can travel along. */
export interface Line {
  dir: Dir;
  /** Row index for across, column index for down. */
  index: number;
}

/** Crossword order: rows 1-6 across, then columns 1-6 down. */
export const LINES: readonly Line[] = [
  ...Array.from({ length: N }, (_, index) => ({ dir: "across" as const, index })),
  ...Array.from({ length: N }, (_, index) => ({ dir: "down" as const, index })),
];

export function lineCells(line: Line): number[] {
  return Array.from({ length: N }, (_, i) =>
    line.dir === "across" ? line.index * N + i : i * N + line.index,
  );
}

/** The line through `cell` in direction `dir`. */
export function lineOf(cell: number, dir: Dir): Line {
  return { dir, index: dir === "across" ? Math.floor(cell / N) : cell % N };
}

function lineIndex(line: Line): number {
  return (line.dir === "across" ? 0 : N) + line.index;
}

const isOpen = (state: GameState, cell: number) =>
  state.entries[cell] === BLANK && !isLocked(state, cell);

/**
 * Where typing goes next (crossword auto-advance): the next empty square
 * along the current line after `from`, wrapping within the line; when the
 * line is full, the first empty square of the following lines in LINES
 * order. Null when the board has no empty square left.
 */
export function nextOpenCell(state: GameState, from: number, dir: Dir): { cell: number; dir: Dir } | null {
  const here = lineOf(from, dir);
  const cells = lineCells(here);
  const at = cells.indexOf(from);
  for (let k = 1; k < N; k++) {
    const c = cells[(at + k) % N];
    if (isOpen(state, c)) return { cell: c, dir };
  }
  const start = lineIndex(here);
  for (let k = 1; k <= LINES.length; k++) {
    const line = LINES[(start + k) % LINES.length];
    const c = lineCells(line).find((x) => isOpen(state, x));
    if (c !== undefined) return { cell: c, dir: line.dir };
  }
  return null;
}

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
    dir: "across",
    advancedFrom: null,
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
 * How a keypad letter stands on the board: `done` once N squares show it
 * (givens and typing alike, right or wrong — a count, never a hint),
 * `over` past N, which means a duplicate somewhere.
 */
export type KeyUse = "open" | "done" | "over";

export function keyUse(entries: string, letter: string): KeyUse {
  let n = 0;
  for (const ch of entries) if (ch === letter) n++;
  return n > N ? "over" : n === N ? "done" : "open";
}

const spellLine = (entries: string, cells: readonly number[]) => cells.map((c) => entries[c]).join("");

/** Whether the unclued line's letters are a word the rules allow there:
 *  "another word from the same letters" — any dictionary word made from
 *  them (`puzzle.lineWords`), other than the clued answer. */
function hiddenLineOk(puzzle: SixfoldPuzzle, word: string): boolean {
  if (word === puzzle.cluedWord) return false;
  return word === puzzle.hiddenWord || (puzzle.lineWords ?? puzzle.family).includes(word);
}

/**
 * Whether a board meets every stated rule: full, no letter twice in a
 * row, column or box, the clued row spelling its answer, and the other
 * line spelling another word from the letters. Usually that is exactly
 * `puzzle.solution`, but not always — the diagonal is not a sudoku unit,
 * so a few days admit a second grid whose diagonal is a real
 * repeat-letter word (2026-03-19: PAPERS where the setter had PAGERS).
 * Such a grid breaks no rule the player was told, so it is a solve.
 */
export function isSolvedBoard(puzzle: SixfoldPuzzle, entries: string): boolean {
  if (entries === puzzle.solution) return true;
  if (entries.length !== CELLS || entries.includes(BLANK)) return false;
  if (conflictCells(puzzle.regions, entries).size > 0) return false;
  return (
    spellLine(entries, cluedCells(puzzle)) === puzzle.cluedWord &&
    hiddenLineOk(puzzle, spellLine(entries, hiddenCells(puzzle)))
  );
}

/**
 * On a full board with no repeats that still isn't a solve, the word
 * lines that break their rule: the clued row not spelling its answer,
 * or the other line not spelling an allowed word. A line that spells an
 * acceptable word is never named, even if it differs from the setter's
 * grid. (On such a board at least one line is named — naming it is the
 * only way a player can find a mistake the board doesn't otherwise show.)
 */
export function wrongLines(puzzle: SixfoldPuzzle, entries: string): LineName[] {
  if (entries.includes(BLANK) || isSolvedBoard(puzzle, entries)) return [];
  if (conflictCells(puzzle.regions, entries).size > 0) return [];
  const out: LineName[] = [];
  if (spellLine(entries, cluedCells(puzzle)) !== puzzle.cluedWord) out.push("clued");
  if (!hiddenLineOk(puzzle, spellLine(entries, hiddenCells(puzzle)))) out.push("hidden");
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
  if (isSolvedBoard(state.puzzle, state.entries)) {
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
      // Tapping the selected cell keeps it selected and flips across/down
      // (crossword convention). It used to toggle off, so re-tapping a
      // cell to fix it left nothing selected and the next letter silently
      // went nowhere.
      if (cell < 0 || cell >= CELLS) return state;
      if (state.selected === cell) {
        return { ...state, dir: state.dir === "across" ? "down" : "across", advancedFrom: null };
      }
      return { ...state, selected: cell, advancedFrom: null };
    }
    case "select": {
      if (action.cell < 0 || action.cell >= CELLS || state.selected === action.cell) return state;
      return { ...state, selected: action.cell, advancedFrom: null };
    }
    case "pressLetter": {
      const letter = action.letter.toLowerCase();
      if (!state.puzzle.letters.includes(letter) || state.solved) return state;
      if (state.selected === null) return { ...state, feedback: { type: "noCell", nonce: nextNonce(state) } };
      const cell = state.selected;
      const after = write(state, cell, letter);
      // Advance past a letter that landed — or that was already there, as
      // a crossword does. A locked cell or a solve keeps (or clears) the
      // selection as write left it.
      if (after.solved || isLocked(state, cell) || after.entries[cell] !== letter) return after;
      const next = nextOpenCell(after, cell, state.dir);
      return next ? { ...after, selected: next.cell, dir: next.dir, advancedFrom: cell } : after;
    }
    case "stepLine": {
      const from =
        state.selected === null
          ? action.delta === 1
            ? LINES.length - 1
            : 0
          : lineIndex(lineOf(state.selected, state.dir));
      const line = LINES[(from + action.delta + LINES.length) % LINES.length];
      const cells = lineCells(line);
      // Land on the line's first empty square, or its start when full.
      const cell = cells.find((c) => isOpen(state, c)) ?? cells[0];
      return { ...state, selected: cell, dir: line.dir, advancedFrom: null };
    }
    case "erase": {
      if (state.solved) return state;
      if (state.selected === null) return { ...state, feedback: { type: "noCell", nonce: nextNonce(state) } };
      const cell = state.selected;
      const cleared = { ...state, advancedFrom: null };
      if (state.entries[cell] !== BLANK || isLocked(state, cell)) return write(cleared, cell, BLANK);
      // An empty square: step back and clear, as a crossword's backspace
      // does. Auto-advance usually just moved past the letter the player
      // means to undo — possibly onto another line — so go back THERE;
      // otherwise to the previous open square along this line.
      const cells = lineCells(lineOf(cell, state.dir));
      const back =
        state.advancedFrom ??
        cells
          .slice(0, cells.indexOf(cell))
          .reverse()
          .find((c) => !isLocked(state, c));
      if (back === undefined) return cleared;
      return write({ ...cleared, selected: back }, back, BLANK);
    }
    case "move": {
      if (state.selected === null) return { ...state, selected: 0, advancedFrom: null };
      const r = (Math.floor(state.selected / N) + action.dRow + N) % N;
      const c = ((state.selected % N) + action.dCol + N) % N;
      return { ...state, selected: r * N + c, advancedFrom: null };
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
        solved: action.solved && isSolvedBoard(state.puzzle, entries),
        hints: action.hints ?? 0,
        conflicts: action.conflicts ?? 0,
        selected: null,
        feedback: null,
      };
    }
  }
}
