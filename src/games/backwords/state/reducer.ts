import type { Puzzle, RowDef } from "../engine/types";

export interface CommittedRow {
  /** The letters as placed (a pair orientation or a palindrome half). */
  place: string;
  def: RowDef;
}

export type SubmitResult =
  | { type: "committed"; row: RowDef; nonce: number }
  | { type: "solved"; row: RowDef; nonce: number }
  | { type: "invalid"; place: string; nonce: number }
  | { type: "duplicate"; place: string; nonce: number }
  | { type: "empty"; nonce: number };

export interface GameState {
  puzzle: Puzzle;
  /** placement string -> row definition (the playable lexicon). */
  lexicon: Map<string, RowDef>;
  /** Letters still in the rack (sorted). */
  bank: string[];
  /** Letters staged in the active row, in placement order. */
  current: string;
  rows: CommittedRow[];
  solved: boolean;
  lastResult: SubmitResult | null;
}

export type Action =
  | { type: "typeLetter"; letter: string }
  | { type: "backspace" }
  | { type: "clearRow" }
  | { type: "commit" }
  | { type: "breakRow"; index: number }
  | { type: "hydrate"; places: string[]; solved: boolean };

let nonce = 0;

export function initialState(init: {
  puzzle: Puzzle;
  lexicon: Map<string, RowDef>;
}): GameState {
  return {
    puzzle: init.puzzle,
    lexicon: init.lexicon,
    bank: [...init.puzzle.bank].sort(),
    current: "",
    rows: [],
    solved: false,
    lastResult: null,
  };
}

const rowKey = (def: RowDef) => [...def.words].sort().join("/");

function commitPlaces(
  state: GameState,
  places: string[],
): Pick<GameState, "bank" | "rows"> | null {
  const bank = [...state.puzzle.bank];
  const rows: CommittedRow[] = [];
  for (const place of places) {
    const def = state.lexicon.get(place);
    if (!def) return null;
    for (const ch of place) {
      const at = bank.indexOf(ch);
      if (at === -1) return null;
      bank.splice(at, 1);
    }
    rows.push({ place, def });
  }
  return { bank: bank.sort(), rows };
}

export function gameReducer(state: GameState, action: Action): GameState {
  // The board is final once solved — the clock stopped there.
  if (state.solved && action.type !== "hydrate") return state;

  switch (action.type) {
    case "typeLetter": {
      const letter = action.letter.toLowerCase();
      const at = state.bank.indexOf(letter);
      if (at === -1 || state.current.length >= 10) return state;
      return {
        ...state,
        bank: state.bank.filter((_, i) => i !== at),
        current: state.current + letter,
      };
    }
    case "backspace": {
      if (state.current.length === 0) return state;
      const letter = state.current[state.current.length - 1];
      return {
        ...state,
        bank: [...state.bank, letter].sort(),
        current: state.current.slice(0, -1),
      };
    }
    case "clearRow": {
      if (state.current.length === 0) return state;
      return {
        ...state,
        bank: [...state.bank, ...state.current].sort(),
        current: "",
      };
    }
    case "commit": {
      if (state.current.length === 0) {
        return { ...state, lastResult: { type: "empty", nonce: ++nonce } };
      }
      const def = state.lexicon.get(state.current);
      if (!def) {
        return {
          ...state,
          lastResult: { type: "invalid", place: state.current, nonce: ++nonce },
        };
      }
      if (state.rows.some((r) => rowKey(r.def) === rowKey(def))) {
        return {
          ...state,
          lastResult: {
            type: "duplicate",
            place: state.current,
            nonce: ++nonce,
          },
        };
      }
      const rows = [...state.rows, { place: state.current, def }];
      const solved = state.bank.length === 0;
      return {
        ...state,
        rows,
        current: "",
        solved,
        lastResult: { type: solved ? "solved" : "committed", row: def, nonce: ++nonce },
      };
    }
    case "breakRow": {
      const row = state.rows[action.index];
      if (!row) return state;
      return {
        ...state,
        rows: state.rows.filter((_, i) => i !== action.index),
        bank: [...state.bank, ...row.place].sort(),
      };
    }
    case "hydrate": {
      // Replay the saved placements against the CURRENT lexicon; a save
      // that no longer validates starts the day fresh (dictVersion
      // guards this upstream, so this is belt and braces).
      const applied = commitPlaces(state, action.places);
      if (!applied) return state;
      return {
        ...state,
        ...applied,
        current: "",
        solved: action.solved && applied.bank.length === 0,
        lastResult: null,
      };
    }
  }
}

/** Rows whose reflection a real mirror would render — the ✦ count. */
export function glyphRowCount(rows: CommittedRow[]): number {
  return rows.filter((r) => r.def.glyph).length;
}
