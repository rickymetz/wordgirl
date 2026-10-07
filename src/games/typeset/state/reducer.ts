import { NO_HINTS, nextHint, type HintFact, type HintState } from "../engine/hints";
import type { Board } from "../engine/schedule";
import { isSet, tripleKey } from "../engine/sets";

/** What the last completed selection did — the screen turns it into a toast. */
export type Verdict =
  | { kind: "found"; key: string; id: number }
  | { kind: "already"; key: string; id: number }
  | { kind: "miss"; id: number }
  | { kind: "hint"; fact: HintFact; id: number }
  | { kind: "no-hint"; id: number };

export interface GameState {
  board: Board;
  /** Indexes of the selected cards (0–2 of them), in tap order. */
  selected: number[];
  /** Found sets as tripleKeys, in the order found. */
  found: string[];
  misses: number;
  hints: number;
  hintState: HintState;
  /** The outcome of the last selection or hint, for the toast and the live region. */
  verdict: Verdict | null;
  solved: boolean;
}

export type Action =
  | { type: "tap"; index: number }
  | { type: "clear" }
  | { type: "hint" }
  | {
      type: "hydrate";
      found: string[];
      misses: number;
      hints: number;
      hintState?: HintState;
    };

export function initialState(board: Board): GameState {
  return { board, selected: [], found: [], misses: 0, hints: 0, hintState: NO_HINTS, verdict: null, solved: false };
}

const nextId = (s: GameState) => (s.verdict?.id ?? 0) + 1;

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "tap": {
      if (state.solved || action.index < 0 || action.index >= state.board.cards.length) return state;
      if (state.selected.includes(action.index)) {
        return { ...state, selected: state.selected.filter((i) => i !== action.index) };
      }
      const selected = [...state.selected, action.index];
      if (selected.length < 3) return { ...state, selected };
      const key = tripleKey(selected);
      const [a, b, c] = selected.map((i) => state.board.cards[i]);
      if (!isSet(a, b, c)) {
        return { ...state, selected: [], misses: state.misses + 1, verdict: { kind: "miss", id: nextId(state) } };
      }
      if (state.found.includes(key)) {
        return { ...state, selected: [], verdict: { kind: "already", key, id: nextId(state) } };
      }
      const found = [...state.found, key];
      return {
        ...state,
        selected: [],
        found,
        solved: found.length === state.board.sets.length,
        verdict: { kind: "found", key, id: nextId(state) },
      };
    }
    case "clear":
      return state.selected.length === 0 ? state : { ...state, selected: [] };
    case "hint": {
      if (state.solved) return state;
      const step = nextHint(state.board, state.found, state.hintState);
      if (!step) return { ...state, verdict: { kind: "no-hint", id: nextId(state) } };
      return {
        ...state,
        hints: state.hints + 1,
        hintState: step.state,
        verdict: { kind: "hint", fact: step.fact, id: nextId(state) },
      };
    }
    case "hydrate": {
      // Only sets that really are sets on THIS board survive — a save
      // can never smuggle in a key the board doesn't contain.
      const valid = new Set(state.board.sets.map(tripleKey));
      const found = action.found.filter((k, i, all) => valid.has(k) && all.indexOf(k) === i);
      return {
        ...state,
        selected: [],
        found,
        misses: action.misses,
        hints: action.hints,
        hintState: action.hintState ?? NO_HINTS,
        verdict: null,
        solved: found.length === state.board.sets.length,
      };
    }
  }
}
