import { reverse, fitsIn, toMultiset, type Puzzle, type RowDef } from "../engine/types";
import { lexiconItems } from "../engine/lexicon";
import { solveBank } from "../engine/generator";

export interface CommittedRow {
  /** The letters as placed (a pair orientation or a palindrome half). */
  place: string;
  def: RowDef;
}

export type SubmitResult =
  | { type: "committed"; row: RowDef; nonce: number }
  | { type: "solved"; row: RowDef; nonce: number }
  /** badWord: which reading fails — the staged word or its mirror.
   * reason "rare": badWord IS a word, just not common enough to play. */
  | {
      type: "invalid";
      place: string;
      badWord: string;
      reason: "notWord" | "rare";
      nonce: number;
    }
  | { type: "duplicate"; place: string; nonce: number }
  | { type: "empty"; nonce: number };

export interface GameState {
  puzzle: Puzzle;
  /** placement string -> row definition (the playable lexicon). */
  lexicon: Map<string, RowDef>;
  /** The common tier as a flat set — names WHICH reading failed. */
  words: Set<string>;
  /** Full-dictionary membership (both tiers) — a real-but-rare word
   * deserves a different message than a non-word. */
  isWord: (word: string) => boolean;
  /** Letters still in the rack (sorted). */
  bank: string[];
  /** Letters staged in the active row, in placement order. */
  current: string;
  rows: CommittedRow[];
  solved: boolean;
  lastResult: SubmitResult | null;
  /** Committed rows broken back apart (persisted for trends). */
  takeBacks: number;
  /** Commits the mirror rejected — invalid or too rare (persisted). */
  invalids: number;
  /** Rows placed via the hint button (persisted for trends). */
  hints: number;
}

export type Action =
  | { type: "typeLetter"; letter: string }
  | { type: "backspace" }
  /** Drag a staged tile back off the board (any position). */
  | { type: "unstage"; index: number }
  | { type: "clearRow" }
  | { type: "commit" }
  | { type: "breakRow"; index: number }
  | { type: "revealHint" }
  | {
      type: "hydrate";
      places: string[];
      solved: boolean;
      takeBacks?: number;
      invalids?: number;
      hints?: number;
    };

export function initialState(init: {
  puzzle: Puzzle;
  lexicon: Map<string, RowDef>;
  words: Set<string>;
  isWord: (word: string) => boolean;
}): GameState {
  return {
    puzzle: init.puzzle,
    lexicon: init.lexicon,
    words: init.words,
    isWord: init.isWord,
    bank: [...init.puzzle.bank].sort(),
    current: "",
    rows: [],
    solved: false,
    lastResult: null,
    takeBacks: 0,
    invalids: 0,
    hints: 0,
  };
}

const rowKey = (def: RowDef) => [...def.words].sort().join("/");

/**
 * Resolve staged letters to their row: aliases (POO or POOP -> the
 * POOP row) keep the canonical placement and hand the extras back.
 * The single seam the board preview AND the commit path both use.
 */
export function resolvePlacement(
  lexicon: Map<string, RowDef>,
  staged: string,
): { def: RowDef | undefined; place: string; extra: string } {
  const def = lexicon.get(staged);
  const place = def && staged.startsWith(def.place) ? def.place : staged;
  return { def, place, extra: staged.slice(place.length) };
}

/**
 * What a committed row saves as. Palindromes save their FULL word,
 * not their placement — the bare half is ambiguous where two
 * palindromes share it (lexicon.get("po") is POP, so a POOP row saved
 * as "po" would silently reload as POP).
 */
export function rowSaveKey(row: CommittedRow): string {
  return row.def.kind === "palindrome" ? row.def.words[0] : row.place;
}

function commitPlaces(
  state: GameState,
  saved: string[],
): Pick<GameState, "bank" | "rows"> | null {
  const bank = [...state.puzzle.bank];
  const rows: CommittedRow[] = [];
  const placed = new Set<string>();
  for (const key of saved) {
    const def = state.lexicon.get(key);
    if (!def) return null;
    // A corrupt or ambiguous save must not fabricate duplicate rows.
    if (placed.has(rowKey(def))) return null;
    placed.add(rowKey(def));
    // Charge the CANONICAL placement (saved keys may be full words).
    for (const ch of def.place) {
      const at = bank.indexOf(ch);
      if (at === -1) return null;
      bank.splice(at, 1);
    }
    rows.push({ place: def.place, def });
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
    case "unstage": {
      const letter = state.current[action.index];
      if (letter === undefined) return state;
      return {
        ...state,
        bank: [...state.bank, letter].sort(),
        current:
          state.current.slice(0, action.index) +
          state.current.slice(action.index + 1),
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
      // Pure, state-derived nonce (crosshatch's pattern): reducers get
      // double-invoked in StrictMode, so no module-level counters.
      const nonce = (state.lastResult?.nonce ?? 0) + 1;
      if (state.current.length === 0) {
        return { ...state, lastResult: { type: "empty", nonce } };
      }
      const resolved = resolvePlacement(state.lexicon, state.current);
      let def = resolved.def;
      if (!def) {
        const place = state.current;
        const rev = reverse(place);
        // Name the reading that fails and HOW it fails: a non-word
        // beats "too rare" (blame the mirror side when the staged word
        // is fine: BAD -> DAB isn't a word), and a real-but-bonus-tier
        // word (WILT, TAM) is never called "not a word".
        const notWord = !state.isWord(place)
          ? place
          : !state.isWord(rev)
            ? rev
            : null;
        const badWord =
          notWord ?? (!state.words.has(place) ? place : rev);
        return {
          ...state,
          invalids: state.invalids + 1,
          lastResult: {
            type: "invalid",
            place,
            badWord,
            reason: notWord ? "notWord" : "rare",
            nonce,
          },
        };
      }
      const placedKeys = new Set(state.rows.map((r) => rowKey(r.def)));
      if (placedKeys.has(rowKey(def))) {
        // A placement can read as MORE than one word (PO -> POP or
        // POOP). When this reading is already on the board, the
        // mirror offers the next unplaced sibling instead of
        // stonewalling — otherwise a bank without spare letters could
        // never reach the longer word after placing the shorter.
        let sibling: RowDef | undefined;
        for (const d of state.lexicon.values()) {
          if (d.place === def.place && !placedKeys.has(rowKey(d))) {
            sibling = d;
            break;
          }
        }
        if (!sibling) {
          return {
            ...state,
            lastResult: { type: "duplicate", place: state.current, nonce },
          };
        }
        def = sibling;
      }
      // An aliased placement staged more letters than the mirror
      // needs: the row keeps the canonical placement and the extras
      // go home to the rack.
      const { extra } = resolvePlacement(state.lexicon, state.current);
      const bank = extra ? [...state.bank, ...extra].sort() : state.bank;
      const rows = [...state.rows, { place: def.place, def }];
      const solved = bank.length === 0;
      return {
        ...state,
        rows,
        current: "",
        bank,
        solved,
        lastResult: { type: solved ? "solved" : "committed", row: def, nonce },
      };
    }
    case "breakRow": {
      const row = state.rows[action.index];
      if (!row) return state;
      return {
        ...state,
        rows: state.rows.filter((_, i) => i !== action.index),
        bank: [...state.bank, ...row.place].sort(),
        takeBacks: state.takeBacks + 1,
      };
    }
    case "revealHint": {
      const placedKeys = new Set(state.rows.map((r) => rowKey(r.def)));
      const bankWithCurrent = [...state.bank, ...state.current].sort();
      const bankMs = toMultiset(bankWithCurrent);

      // Try seedRows first — fast path when the player hasn't diverged.
      let def: RowDef | undefined;
      for (const key of state.puzzle.seedRows) {
        const d = state.lexicon.get(key);
        if (d && !placedKeys.has(rowKey(d)) && fitsIn(toMultiset(d.cost), bankMs)) {
          def = d;
          break;
        }
      }

      // Fallback: find any row from a valid completion of the current bank.
      if (!def) {
        const items = lexiconItems(state.lexicon).filter(
          (d) => !placedKeys.has(rowKey(d)),
        );
        const completions = solveBank(bankMs, items, 1);
        if (completions.length > 0) def = completions[0][0];
      }

      if (!def) return state;
      const bank = [...bankWithCurrent];
      for (const ch of def.place) {
        bank.splice(bank.indexOf(ch), 1);
      }
      bank.sort();
      const nonce = (state.lastResult?.nonce ?? 0) + 1;
      const rows = [...state.rows, { place: def.place, def }];
      const solved = bank.length === 0;
      return {
        ...state,
        rows,
        current: "",
        bank,
        solved,
        lastResult: { type: solved ? "solved" : "committed", row: def, nonce },
        hints: state.hints + 1,
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
        takeBacks: action.takeBacks ?? 0,
        invalids: action.invalids ?? 0,
        hints: action.hints ?? 0,
      };
    }
  }
}

/** Rows whose reflection a real mirror would render — the ✦ count. */
export function glyphRowCount(rows: CommittedRow[]): number {
  return rows.filter((r) => r.def.glyph).length;
}
