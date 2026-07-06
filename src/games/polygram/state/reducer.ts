import { levelBonus, wordPoints } from "../engine/scoring";
import type { Puzzle } from "../engine/types";

export type Phase = "playing" | "levelClear" | "done";

export interface SubmitResult {
  type: "correct" | "duplicate" | "invalid";
  word: string;
  points?: number;
  /** Monotonic counter so the UI can re-trigger animations on repeats. */
  nonce: number;
}

export interface GameState {
  puzzle: Puzzle;
  levelIndex: number;
  /** All found words across levels, in the order found. */
  found: string[];
  /** word -> number of letters revealed via hints. */
  revealed: Record<string, number>;
  score: number;
  /** The word currently being built. */
  current: string;
  phase: Phase;
  lastResult: SubmitResult | null;
}

export type GameAction =
  | { type: "tapLetter"; letter: string }
  | { type: "backspace" }
  | { type: "clear" }
  | { type: "submit" }
  | { type: "revealHint" }
  | { type: "advanceLevel" }
  | {
      type: "hydrate";
      found: string[];
      revealed: Record<string, number>;
      score: number;
    };

export function initialState(puzzle: Puzzle): GameState {
  return {
    puzzle,
    levelIndex: 0,
    found: [],
    revealed: {},
    score: 0,
    current: "",
    phase: "playing",
    lastResult: null,
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
      if (state.phase !== "playing" || state.current.length === 0) {
        return state;
      }
      const word = state.current;
      const nonce = (state.lastResult?.nonce ?? 0) + 1;
      const level = currentLevel(state);

      if (state.found.includes(word)) {
        return {
          ...state,
          current: "",
          lastResult: { type: "duplicate", word, nonce },
        };
      }
      if (!level.words.includes(word)) {
        return {
          ...state,
          current: "",
          lastResult: { type: "invalid", word, nonce },
        };
      }

      const points = wordPoints(word, state.revealed[word] ?? 0);
      const found = [...state.found, word];
      let score = state.score + points;
      let phase: Phase = state.phase;

      const cleared = level.words.every((w) => found.includes(w));
      if (cleared) {
        score += levelBonus(level.size);
        phase =
          state.levelIndex === state.puzzle.levels.length - 1
            ? "done"
            : "levelClear";
      }

      return {
        ...state,
        found,
        score,
        phase,
        current: "",
        lastResult: { type: "correct", word, points, nonce },
      };
    }

    case "revealHint": {
      if (state.phase !== "playing") return state;
      const target = unsolvedWords(state)[0];
      if (!target) return state;
      const already = state.revealed[target] ?? 0;
      if (already >= target.length) return state;
      return {
        ...state,
        revealed: { ...state.revealed, [target]: already + 1 },
      };
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

    case "hydrate": {
      // Rebuild derived position (levelIndex/phase) from the saved facts.
      let levelIndex = 0;
      let phase: Phase = "playing";
      for (let i = 0; i < state.puzzle.levels.length; i++) {
        const level = state.puzzle.levels[i];
        const cleared = level.words.every((w) => action.found.includes(w));
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
        score: action.score,
        levelIndex,
        phase,
        current: "",
        lastResult: null,
      };
    }
  }
}
