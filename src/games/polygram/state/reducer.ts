import type { Puzzle } from "../engine/types";

export type Phase = "playing" | "levelClear" | "done";

export interface SubmitResult {
  type: "correct" | "duplicate" | "invalid" | "tooShort" | "empty";
  word: string;
  /** The word came from the bonus tier — never required, pure sweep. */
  bonus?: boolean;
  /** Monotonic counter so the UI can re-trigger animations on repeats. */
  nonce: number;
}

export interface GameState {
  puzzle: Puzzle;
  levelIndex: number;
  /** All found words across levels, in the order found. */
  found: string[];
  /** word -> letter positions revealed via hints. */
  revealed: Record<string, number[]>;
  /** The word currently being built. */
  current: string;
  phase: Phase;
  lastResult: SubmitResult | null;
  /** Level indices the player skipped (gate met via bonus words). */
  skippedLevels: number[];
}

export type GameAction =
  | { type: "tapLetter"; letter: string }
  | { type: "backspace" }
  | { type: "clear" }
  | { type: "submit" }
  | { type: "revealHint"; letterIndex: number; word?: string }
  | { type: "advanceLevel" }
  | { type: "skipLevel" }
  | {
      type: "hydrate";
      found: string[];
      revealed: Record<string, number[]>;
      skippedLevels: number[];
    };

export function initialState(puzzle: Puzzle): GameState {
  return {
    puzzle,
    levelIndex: 0,
    found: [],
    revealed: {},
    current: "",
    phase: "playing",
    lastResult: null,
    skippedLevels: [],
  };
}

export function currentLevel(state: GameState) {
  return state.puzzle.levels[state.levelIndex];
}

export function levelWordsFound(state: GameState, levelIndex: number) {
  const words = state.puzzle.levels[levelIndex].words;
  return words.filter((w) => state.found.includes(w));
}

/** Unsolved words of the current level, in puzzle (alphabetical) order. */
export function unsolvedWords(state: GameState): string[] {
  return currentLevel(state).words.filter((w) => !state.found.includes(w));
}

/**
 * The word hints act on: the first unsolved word. (Fully revealed words
 * auto-submit, so every unsolved word has hidden letters left.)
 */
export function hintTarget(state: GameState): string | undefined {
  return unsolvedWords(state)[0];
}

/**
 * True when the total words found for the current level (core + bonus)
 * meets the gate (core word count) but some core words remain unfound.
 */
export function canSkipLevel(state: GameState): boolean {
  if (state.phase !== "playing") return false;
  const level = currentLevel(state);
  const coreFound = levelWordsFound(state, state.levelIndex).length;
  if (coreFound >= level.words.length) return false;
  const bonusFound = level.bonusWords.filter((w) =>
    state.found.includes(w),
  ).length;
  return coreFound + bonusFound >= level.words.length;
}

/**
 * A word entered the found list (typed or fully hint-revealed): record
 * it, and clear the level when it was the last one.
 */
function applyFoundWord(
  state: GameState,
  word: string,
  bonus = false,
): GameState {
  const nonce = (state.lastResult?.nonce ?? 0) + 1;
  const found = [...state.found, word];
  let phase: Phase = state.phase;

  // Only REQUIRED words gate the level; bonus finds never advance it.
  const level = currentLevel(state);
  if (level.words.every((w) => found.includes(w))) {
    phase =
      state.levelIndex === state.puzzle.levels.length - 1
        ? "done"
        : "levelClear";
  }

  return {
    ...state,
    found,
    phase,
    lastResult: { type: "correct", word, bonus, nonce },
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "tapLetter": {
      if (state.phase !== "playing") return state;
      const size = currentLevel(state).size;
      if (state.current.length >= size) return state;
      return { ...state, current: state.current + action.letter };
    }

    case "backspace":
      return { ...state, current: state.current.slice(0, -1) };

    case "clear":
      return { ...state, current: "" };

    case "submit": {
      if (state.phase !== "playing") return state;
      const word = state.current;
      const nonce = (state.lastResult?.nonce ?? 0) + 1;
      const level = currentLevel(state);

      // Differentiated feedback: an empty submit and a real-but-short
      // word are not "not in word list".
      if (word.length === 0) {
        return { ...state, lastResult: { type: "empty", word, nonce } };
      }
      if (word.length < level.size) {
        return {
          ...state,
          current: "",
          lastResult: { type: "tooShort", word, nonce },
        };
      }

      if (state.found.includes(word)) {
        return {
          ...state,
          current: "",
          lastResult: { type: "duplicate", word, nonce },
        };
      }
      if (level.words.includes(word)) {
        return { ...applyFoundWord(state, word), current: "" };
      }
      if (level.bonusWords.includes(word)) {
        return { ...applyFoundWord(state, word, true), current: "" };
      }
      return {
        ...state,
        current: "",
        lastResult: { type: "invalid", word, nonce },
      };
    }

    case "revealHint": {
      if (state.phase !== "playing") return state;
      // An explicit target must be an unsolved required word of the
      // current level with hidden letters left; otherwise default.
      const explicit =
        action.word !== undefined &&
        unsolvedWords(state).includes(action.word) &&
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
      const next = {
        ...state,
        revealed: {
          ...state.revealed,
          [target]: [...already, action.letterIndex],
        },
      };
      // Every letter revealed → the word counts as submitted, instead
      // of demanding the player retype what is already on screen.
      if (next.revealed[target].length === target.length) {
        return applyFoundWord(next, target);
      }
      return next;
    }

    case "advanceLevel": {
      if (state.phase !== "levelClear") return state;
      return {
        ...state,
        levelIndex: state.levelIndex + 1,
        phase: "playing",
        current: "",
      };
    }

    case "skipLevel": {
      if (!canSkipLevel(state)) return state;
      const isLast = state.levelIndex === state.puzzle.levels.length - 1;
      return {
        ...state,
        levelIndex: state.levelIndex + 1,
        skippedLevels: [...state.skippedLevels, state.levelIndex],
        phase: isLast ? "done" : "playing",
        current: "",
      };
    }

    case "hydrate": {
      let levelIndex = 0;
      let phase: Phase = "playing";
      const skipped = new Set(action.skippedLevels);
      for (let i = 0; i < state.puzzle.levels.length; i++) {
        const level = state.puzzle.levels[i];
        const cleared =
          level.words.every((w) => action.found.includes(w)) ||
          skipped.has(i);
        if (cleared) {
          if (i === state.puzzle.levels.length - 1) {
            levelIndex = i;
            phase = "done";
          } else {
            levelIndex = i + 1;
          }
        } else {
          levelIndex = i;
          break;
        }
      }
      return {
        ...state,
        found: action.found,
        revealed: action.revealed,
        skippedLevels: action.skippedLevels,
        levelIndex,
        phase,
        current: "",
        lastResult: null,
      };
    }
  }
}
