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
  /** Which line through the selection is active — across, down, or the
   *  diagonal on a diagonal day. Not saved: a fresh visit starts across. */
  dir: Dir;
  /** Where auto-advance just came from, so a backspace on the (empty)
   *  square it moved to undoes that letter — and so the first tap on that
   *  square doesn't flip direction. Cleared by any other move. */
  advancedFrom: { cell: number; dir: Dir } | null;
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
  /** Backspace; `here` (the Delete key) only ever clears the selection. */
  | { type: "erase"; here?: boolean }
  | { type: "move"; dRow: number; dCol: number }
  /** Jump to the other word line (next 1 / previous -1 of the two). */
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

export type Dir = "across" | "down" | "diagonal";

/** A row (across), a column (down), or the main diagonal. */
export interface Line {
  dir: Dir;
  /** Row index for across, column index for down; 0 for the diagonal. */
  index: number;
}

export function lineCells(line: Line): number[] {
  return Array.from({ length: N }, (_, i) =>
    line.dir === "across"
      ? line.index * N + i
      : line.dir === "down"
        ? i * N + line.index
        : i * N + i,
  );
}

/** The line through `cell` in direction `dir`. */
export function lineOf(cell: number, dir: Dir): Line {
  return {
    dir,
    index: dir === "across" ? Math.floor(cell / N) : dir === "down" ? cell % N : 0,
  };
}

export const sameLine = (a: Line, b: Line) => a.dir === b.dir && a.index === b.index;

/** The day's two words: the clued row, then the hidden line. */
export function wordLines(puzzle: SixfoldPuzzle): [Line, Line] {
  return [
    { dir: "across", index: puzzle.row },
    puzzle.col < 0 ? { dir: "diagonal", index: 0 } : { dir: "down", index: puzzle.col },
  ];
}

export function isWordLine(puzzle: SixfoldPuzzle, line: Line): boolean {
  return wordLines(puzzle).some((w) => sameLine(w, line));
}

/** Directions open at `cell`: across and down, plus the diagonal when the
 *  day's hidden word runs down it and the cell sits on it. */
export function dirsAt(puzzle: SixfoldPuzzle, cell: number): Dir[] {
  const onDiagonal = puzzle.col < 0 && Math.floor(cell / N) === cell % N;
  return onDiagonal ? ["across", "down", "diagonal"] : ["across", "down"];
}

const isOpen = (state: GameState, cell: number) =>
  state.entries[cell] === BLANK && !isLocked(state, cell);

/**
 * Auto-advance, for the two WORD lines only: the next empty square along
 * that word after `from`, wrapping within it; null when the word is full
 * or the line isn't a word. Everywhere else Sixfold plays like sudoku —
 * one deduction here, the next somewhere else — so the cursor stays put.
 */
export function nextOpenCell(state: GameState, from: number, dir: Dir): number | null {
  const line = lineOf(from, dir);
  if (!isWordLine(state.puzzle, line)) return null;
  const cells = lineCells(line);
  const at = cells.indexOf(from);
  for (let k = 1; k < N; k++) {
    const c = cells[(at + k) % N];
    if (isOpen(state, c)) return c;
  }
  return null;
}

/**
 * Select `cell`, keeping the direction where it still applies. Arriving on
 * ONE word line from a direction that isn't a word there turns to follow
 * the word, so typing into the hidden column runs down it without a flip;
 * where the two words cross, the current direction stands.
 */
function selectCell(state: GameState, cell: number): GameState {
  const dirs = dirsAt(state.puzzle, cell);
  let dir = dirs.includes(state.dir) ? state.dir : "across";
  if (!isWordLine(state.puzzle, lineOf(cell, dir))) {
    // Not a word this way: follow a word through the square if there is
    // one (at a crossing, the first — the clued row).
    const words = dirs.filter((d) => isWordLine(state.puzzle, lineOf(cell, d)));
    if (words.length > 0) dir = words[0];
  }
  return { ...state, selected: cell, dir, advancedFrom: null };
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
 * with none of them repeating in a row, column or box (givens and typing
 * alike — a count and a visible clash check, never a hint); `over` past
 * N, or at N with a clash, since a greyed key would read as finished.
 */
export type KeyUse = "open" | "done" | "over";

export function keyUse(entries: string, letter: string, clashes: ReadonlySet<number>): KeyUse {
  let n = 0;
  for (const ch of entries) if (ch === letter) n++;
  if (n > N) return "over";
  if (n < N) return "open";
  return [...entries].some((ch, c) => ch === letter && clashes.has(c)) ? "over" : "done";
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
      if (cell < 0 || cell >= CELLS) return state;
      if (state.selected === cell) {
        // The first tap on a square auto-advance just moved to is the
        // player picking it — not a flip. After that, re-tapping cycles
        // the directions (crossword convention). Tapping never deselects:
        // a re-tap to fix a cell used to leave nothing selected.
        if (state.advancedFrom !== null) return { ...state, advancedFrom: null };
        const dirs = dirsAt(state.puzzle, cell);
        const dir = dirs[(dirs.indexOf(state.dir) + 1) % dirs.length];
        return { ...state, dir };
      }
      return selectCell(state, cell);
    }
    case "select": {
      if (action.cell < 0 || action.cell >= CELLS || state.selected === action.cell) return state;
      return selectCell(state, action.cell);
    }
    case "pressLetter": {
      const letter = action.letter.toLowerCase();
      if (!state.puzzle.letters.includes(letter) || state.solved) return state;
      if (state.selected === null) return { ...state, feedback: { type: "noCell", nonce: nextNonce(state) } };
      const cell = state.selected;
      const wasEmpty = state.entries[cell] === BLANK;
      const after = { ...write(state, cell, letter), advancedFrom: null };
      // Advance only when a letter FILLED an empty square of a word line:
      // overwriting a mistake keeps the cursor on the fix, and a locked
      // cell or a solve leaves the selection as write left it.
      if (after.solved || !wasEmpty || after.entries[cell] !== letter) return after;
      const next = nextOpenCell(after, cell, state.dir);
      return next === null
        ? after
        : { ...after, selected: next, advancedFrom: { cell, dir: state.dir } };
    }
    case "stepLine": {
      const [clued, hidden] = wordLines(state.puzzle);
      const here = state.selected === null ? null : lineOf(state.selected, state.dir);
      const line =
        here && sameLine(here, clued)
          ? hidden
          : here && sameLine(here, hidden)
            ? clued
            : action.delta === 1
              ? clued
              : hidden;
      const cells = lineCells(line);
      // Land on the word's first empty square, else its first square that
      // takes a letter, else its start.
      const cell =
        cells.find((c) => isOpen(state, c)) ?? cells.find((c) => !isLocked(state, c)) ?? cells[0];
      return { ...state, selected: cell, dir: line.dir, advancedFrom: null };
    }
    case "erase": {
      if (state.solved) return state;
      if (state.selected === null) return { ...state, feedback: { type: "noCell", nonce: nextNonce(state) } };
      const cell = state.selected;
      if (state.entries[cell] !== BLANK || isLocked(state, cell) || action.here) {
        return write({ ...state, advancedFrom: null }, cell, BLANK);
      }
      // An empty square: undo ONLY the letter auto-advance just moved past
      // (back to that square and direction). Anything else would wipe a
      // deduction the player made elsewhere, with no undo.
      const from = state.advancedFrom;
      if (from === null) return state;
      return write({ ...state, selected: from.cell, dir: from.dir, advancedFrom: null }, from.cell, BLANK);
    }
    case "move": {
      if (state.selected === null) return selectCell(state, 0);
      const r = (Math.floor(state.selected / N) + action.dRow + N) % N;
      const c = ((state.selected % N) + action.dCol + N) % N;
      return selectCell(state, r * N + c);
    }
    case "revealHint": {
      // The next cell the player's own toolkit would deduce — a hint that
      // teaches the next move, not the first gap in reading order.
      const cell = hintCell(state.puzzle, state.entries);
      if (cell === null) return state;
      const entries =
        state.entries.slice(0, cell) + state.puzzle.solution[cell] + state.entries.slice(cell + 1);
      const revealed = [...state.revealed, cell];
      // The player's selection stays: jumping it onto the (locked) hinted
      // square stranded the next letter on "can't change". When the hint
      // filled the selected square itself, step on along its line.
      let selected = state.selected;
      if (selected === cell) {
        const line = lineCells(lineOf(cell, state.dir));
        const at = line.indexOf(cell);
        const open = (c: number) =>
          entries[c] === BLANK && !state.puzzle.givens.includes(c) && !revealed.includes(c);
        selected = [1, 2, 3, 4, 5].map((k) => line[(at + k) % N]).find(open) ?? selected;
      }
      return settle(
        {
          ...state,
          entries,
          revealed,
          selected,
          hints: state.hints + 1,
          advancedFrom: null,
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
        advancedFrom: null,
        feedback: null,
      };
    }
  }
}
