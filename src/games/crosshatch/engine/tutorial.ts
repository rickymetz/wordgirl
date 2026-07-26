import { DICT_VERSION, type Dictionary } from "../../../lib/words/dictionary";
import { enumerateCombos, gridSize } from "./generator";
import type { CrosshatchPuzzle, Shape } from "./types";

/**
 * The tutorial shape: the smallest crosshatch there is — two three-letter
 * lines sharing one cell.
 *
 *     C · N        across (0,0) len 3
 *       ·          down   (0,1) len 3
 *       L
 *
 * NOT appended to SHAPES: daily seeds index that array by position, so
 * adding to it would reshuffle every past puzzle.
 */
export const TUTORIAL_SHAPE: Shape = {
  id: "tutorial",
  slots: [
    { dir: "across", row: 0, col: 0, len: 3 },
    { dir: "down", row: 0, col: 1, len: 3 },
  ],
};

/**
 * Three locked letters leave exactly two cells to type — the crossing
 * and the middle of the down word. That yields C_N × _ _ L, which the
 * required tier fills exactly three ways:
 *
 *     CAN / ALL      CON / OIL      CON / OWL
 *
 * Five distinct words, and no single submission banks more than two of
 * them, so sweeping the grid REQUIRES changing a line and submitting
 * again — which is the rule players otherwise never discover. The daily
 * generator could not produce this (its floor is ten words).
 */
export const TUTORIAL_GIVENS: Record<string, string> = {
  "0,0": "c",
  "0,2": "n",
  "2,1": "l",
};

/** How many steps the script has — the index that means "finished". */
export const TUTORIAL_STEP_COUNT = 4;

/**
 * The tutorial puzzle. Combos are enumerated from the live dictionary
 * rather than hardcoded, so the accepted fillings and the words the panel
 * lists can never drift apart from each other.
 */
export function tutorialPuzzle(dict: Dictionary): CrosshatchPuzzle {
  const { rows, cols } = gridSize(TUTORIAL_SHAPE);
  return {
    seed: "tutorial",
    dictVersion: DICT_VERSION,
    shape: TUTORIAL_SHAPE,
    rows,
    cols,
    givens: TUTORIAL_GIVENS,
    combos: enumerateCombos(
      TUTORIAL_SHAPE,
      dict,
      new Map(Object.entries(TUTORIAL_GIVENS)),
    ),
  };
}

/**
 * Which step the board is on. Takes the fields it reads rather than the
 * reducer's GameState, so the engine stays free of state/ imports.
 */
export function tutorialStepIndex(s: {
  grid: Record<string, string>;
  found: readonly string[];
  solved: boolean;
}): number {
  if (s.solved) return TUTORIAL_STEP_COUNT;
  // A first submission banks both of its words, so three or more means a
  // SECOND grid has landed — the "change a line" lesson is understood.
  if (s.found.length >= 3) return 3;
  if (s.found.length >= 1) return 2;
  // Both typeable cells filled: the grid is ready to submit.
  if (Object.keys(s.grid).length >= 2) return 1;
  return 0;
}
