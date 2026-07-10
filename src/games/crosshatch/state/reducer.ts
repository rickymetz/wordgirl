import type { CrosshatchPuzzle, Slot, SlotDir } from "../engine/types";
import { cellKey, comboKey, slotCells } from "../engine/types";
import { isSolved, uniqueWords } from "../engine/scoring";

export interface Cursor {
  row: number;
  col: number;
  dir: SlotDir;
}

export interface SubmitResult {
  type: "correct" | "nothingNew" | "incomplete" | "noFit" | "repeat";
  /** The offending word for noFit/repeat. */
  word?: string;
  /** Words banked by a correct submission, in slot order. */
  newWords?: string[];
  /** Monotonic counter so the UI can re-trigger animations on repeats. */
  nonce: number;
}

export interface GameState {
  puzzle: CrosshatchPuzzle;
  /** Player-typed letters, cell key -> letter. Given cells never appear. */
  grid: Record<string, string>;
  cursor: Cursor | null;
  /** Distinct words banked so far, in the order they were found. */
  found: string[];
  /** Hint reveals: word -> revealed letter positions. */
  revealed: Record<string, number[]>;
  /** Sticky: reached the solve threshold at some point (survives replays
      of the grid, never un-solves). */
  solved: boolean;
  lastResult: SubmitResult | null;
  /** Submissions rejected on a word — noFit or repeat (persisted for
   * trends; incomplete grids and re-arrangements don't count). */
  invalids: number;
}

export type GameAction =
  | { type: "focusCell"; row: number; col: number; dir?: SlotDir }
  | { type: "typeLetter"; letter: string }
  | { type: "backspace" }
  | { type: "clearEntry" }
  | { type: "submit" }
  | { type: "revealHint"; letterIndex: number; word?: string }
  | {
      type: "hydrate";
      found: string[];
      grid: Record<string, string>;
      revealed: Record<string, number[]>;
      solved: boolean;
      invalids?: number;
    };

export function initialState(puzzle: CrosshatchPuzzle): GameState {
  return {
    puzzle,
    grid: {},
    cursor: firstEditableCursor(puzzle),
    found: [],
    revealed: {},
    solved: false,
    lastResult: null,
    invalids: 0,
  };
}

function firstEditableCursor(puzzle: CrosshatchPuzzle): Cursor | null {
  for (const slot of puzzle.shape.slots) {
    for (const c of slotCells(slot)) {
      if (!puzzle.givens[cellKey(c.row, c.col)]) {
        return { row: c.row, col: c.col, dir: slot.dir };
      }
    }
  }
  return null;
}


/** The day's full word list, shortest first then alphabetical — the
 * order of the words panel, blanks included. */
export function allWords(state: GameState): string[] {
  return uniqueWords(state.puzzle.combos).sort(
    (a, b) => a.length - b.length || a.localeCompare(b),
  );
}

export function unfoundWords(state: GameState): string[] {
  return allWords(state).filter((w) => !state.found.includes(w));
}

/** Default hint target: the first unfound word in list order. */
export function hintTarget(state: GameState): string | null {
  return unfoundWords(state)[0] ?? null;
}

/** The letter shown at a cell: a locked given or the typed letter. */
export function letterAt(
  state: GameState,
  row: number,
  col: number,
): string | undefined {
  const key = cellKey(row, col);
  return state.puzzle.givens[key] ?? state.grid[key];
}

/** Slots that include the cell (1 or 2 — one per direction). */
export function slotsAt(
  puzzle: CrosshatchPuzzle,
  row: number,
  col: number,
): Slot[] {
  return puzzle.shape.slots.filter((s) =>
    slotCells(s).some((c) => c.row === row && c.col === col),
  );
}

/** The slot the cursor is travelling along. */
export function cursorSlot(state: GameState): Slot | null {
  if (!state.cursor) return null;
  const slots = slotsAt(state.puzzle, state.cursor.row, state.cursor.col);
  return slots.find((s) => s.dir === state.cursor!.dir) ?? slots[0] ?? null;
}



/** The word currently on a slot; empty cells become "". */
export function slotWord(
  state: GameState,
  slot: Slot,
): { word: string; complete: boolean } {
  let word = "";
  let complete = true;
  for (const c of slotCells(slot)) {
    const letter = letterAt(state, c.row, c.col);
    if (!letter) complete = false;
    word += letter ?? "";
  }
  return { word, complete };
}

function editableCellsAfter(
  puzzle: CrosshatchPuzzle,
  slot: Slot,
  fromIndex: number,
): { row: number; col: number }[] {
  return slotCells(slot)
    .slice(fromIndex)
    .filter((c) => !puzzle.givens[cellKey(c.row, c.col)]);
}

function cellIndexInSlot(slot: Slot, row: number, col: number): number {
  return slotCells(slot).findIndex((c) => c.row === row && c.col === col);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "focusCell": {
      const slots = slotsAt(state.puzzle, action.row, action.col);
      if (slots.length === 0) return state;
      const { cursor } = state;
      const sameCell =
        cursor && cursor.row === action.row && cursor.col === action.col;
      // An explicit direction wins (slot chips aim at a specific slot);
      // re-tapping the focused cell of a crossing flips direction.
      const dir =
        action.dir && slots.some((s) => s.dir === action.dir)
          ? action.dir
          : sameCell
            ? (slots.find((s) => s.dir !== cursor.dir)?.dir ?? cursor.dir)
            : (slots.find((s) => s.dir === cursor?.dir)?.dir ?? slots[0].dir);
      return { ...state, cursor: { row: action.row, col: action.col, dir } };
    }

    case "typeLetter": {
      const slot = cursorSlot(state);
      if (!slot || !state.cursor) return state;
      const letter = action.letter.toLowerCase();
      if (!/^[a-z]$/.test(letter)) return state;
      const idx = cellIndexInSlot(slot, state.cursor.row, state.cursor.col);
      // Write at the cursor if editable, else the next editable cell.
      const [target, next] = editableCellsAfter(state.puzzle, slot, idx);
      if (!target) return state;
      const grid = {
        ...state.grid,
        [cellKey(target.row, target.col)]: letter,
      };
      const after = next ?? target;
      return {
        ...state,
        grid,
        cursor: { row: after.row, col: after.col, dir: slot.dir },
      };
    }

    case "backspace": {
      const slot = cursorSlot(state);
      if (!slot || !state.cursor) return state;
      const key = cellKey(state.cursor.row, state.cursor.col);
      if (state.grid[key]) {
        const grid = { ...state.grid };
        delete grid[key];
        return { ...state, grid };
      }
      // Empty (or given) cell: step back to the previous editable cell
      // in the slot and clear it.
      const idx = cellIndexInSlot(slot, state.cursor.row, state.cursor.col);
      const prev = slotCells(slot)
        .slice(0, Math.max(idx, 0))
        .reverse()
        .find((c) => !state.puzzle.givens[cellKey(c.row, c.col)]);
      if (!prev) return state;
      const grid = { ...state.grid };
      delete grid[cellKey(prev.row, prev.col)];
      return {
        ...state,
        grid,
        cursor: { row: prev.row, col: prev.col, dir: slot.dir },
      };
    }

    case "clearEntry": {
      return {
        ...state,
        grid: {},
        cursor: firstEditableCursor(state.puzzle),
      };
    }

    case "submit": {
      const nonce = (state.lastResult?.nonce ?? 0) + 1;
      const fail = (
        type: Exclude<SubmitResult["type"], "correct">,
        word?: string,
      ): GameState => ({
        ...state,
        // Only word-level mistakes count as invalid tries.
        invalids:
          type === "noFit" || type === "repeat"
            ? state.invalids + 1
            : state.invalids,
        lastResult: { type, word, nonce },
      });

      const words: string[] = [];
      for (const slot of state.puzzle.shape.slots) {
        const { word, complete } = slotWord(state, slot);
        if (!complete) return fail("incomplete");
        words.push(word);
      }
      for (let i = 0; i < words.length; i++) {
        if (words.indexOf(words[i]) !== i) return fail("repeat", words[i]);
      }
      // A filling is valid iff it's one of the enumerated combos —
      // that single check covers dictionary membership AND intersections
      // (shared cells hold one letter, so crossings always agree).
      const key = comboKey(words);
      if (!state.puzzle.combos.some((c) => comboKey(c) === key)) {
        return fail("noFit", firstNonComboWord(state, words));
      }
      // A valid grid banks every word not yet credited. Words are the
      // unit of progress — re-arranging already-found words earns
      // nothing, so there's no cross-product sweeping.
      const newWords = words.filter((w) => !state.found.includes(w));
      if (newWords.length === 0) return fail("nothingNew");

      const found = [...state.found, ...newWords];
      const total = uniqueWords(state.puzzle.combos).length;
      return {
        ...state,
        found,
        solved: state.solved || isSolved(found.length, total),
        lastResult: { type: "correct", newWords, nonce },
      };
    }

    case "revealHint": {
      // An explicit target must be an unfound word with hidden letters
      // left; otherwise fall back to the default target.
      const explicit =
        action.word !== undefined &&
        unfoundWords(state).includes(action.word) &&
        (state.revealed[action.word] ?? []).length < action.word.length
          ? action.word
          : undefined;
      const target = explicit ?? hintTarget(state);
      if (!target) return state;
      const already = state.revealed[target] ?? [];
      if (
        action.letterIndex < 0 ||
        action.letterIndex >= target.length ||
        already.includes(action.letterIndex)
      ) {
        return state;
      }
      const positions = [...already, action.letterIndex];
      const revealed = { ...state.revealed, [target]: positions };
      if (positions.length < target.length) return { ...state, revealed };
      // Every letter revealed: the word is findable by definition, so
      // bank it instead of making the player retype what they can see.
      const found = [...state.found, target];
      const nonce = (state.lastResult?.nonce ?? 0) + 1;
      return {
        ...state,
        revealed,
        found,
        solved:
          state.solved ||
          isSolved(found.length, uniqueWords(state.puzzle.combos).length),
        lastResult: { type: "correct", newWords: [target], nonce },
      };
    }

    case "hydrate": {
      return {
        ...state,
        found: action.found,
        grid: action.grid,
        revealed: action.revealed,
        solved:
          action.solved ||
          isSolved(
            action.found.length,
            uniqueWords(state.puzzle.combos).length,
          ),
        lastResult: null,
        invalids: action.invalids ?? 0,
      };
    }
  }
}

/**
 * For feedback on a rejected filling: the first word that appears in NO
 * combo at its slot — the closest thing to "this one's not right".
 */
function firstNonComboWord(state: GameState, words: string[]): string {
  for (let i = 0; i < words.length; i++) {
    if (!state.puzzle.combos.some((c) => c[i] === words[i])) return words[i];
  }
  return words[0];
}
