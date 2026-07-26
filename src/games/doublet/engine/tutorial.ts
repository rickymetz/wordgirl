import { DICT_VERSION } from "../../../lib/words/dictionary";
import { findSlots } from "./generator";
import type { BoardShape, DoubletPuzzle } from "./types";

/**
 * The tutorial board: six cells in a staircase, three dominoes.
 *
 *     A M ·        across: AM, US, GO
 *     · U S        down:   MUG (col 1), SO (col 2)
 *     · G O
 *
 * Six is the smallest board that can TEACH rotation. Four cells tile two
 * ways with the same letter pairs, so a player never has to turn a piece;
 * this cut — one horizontal domino and two vertical — has exactly one
 * solution, and reaching it requires rotating twice.
 *
 * Deliberately its own module rather than an entry in boards.ts SHAPES:
 * daily seeds index those arrays by position, so appending would reshuffle
 * every past board.
 */
const TUTORIAL_BOARD: BoardShape = {
  id: "tutorial",
  rows: 3,
  cols: 3,
  cells: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
  ],
};

/**
 * Tray order is the order they are needed, so the tutorial's steps can
 * name "the first domino" and be right. Letters are UPPERCASE, as the
 * generator emits them.
 */
export const TUTORIAL_PUZZLE: DoubletPuzzle = {
  seed: "tutorial",
  dictVersion: DICT_VERSION,
  difficulty: "easy",
  board: TUTORIAL_BOARD,
  slots: findSlots(TUTORIAL_BOARD),
  dominoes: [
    { id: 0, letters: ["A", "M"] },
    { id: 1, letters: ["U", "G"] },
    { id: 2, letters: ["S", "O"] },
  ],
  solution: [
    // AM lies flat across the top row: A at (0,0), M at (0,1).
    { dominoId: 0, anchor: { row: 0, col: 0 }, orientation: 0 },
    // UG and SO stand on end — the rotation lesson.
    { dominoId: 1, anchor: { row: 1, col: 1 }, orientation: 1 },
    { dominoId: 2, anchor: { row: 1, col: 2 }, orientation: 1 },
  ],
};

/** How many steps the script has — the index that means "finished". */
export const TUTORIAL_STEP_COUNT = 4;

/**
 * Which step the board is on. Takes the fields it reads rather than the
 * reducer's GameState, so the engine stays free of state/ imports.
 */
export function tutorialStepIndex(s: {
  placed: readonly { orientation: number }[];
  selectedDominoId: number | null;
  solved: boolean;
}): number {
  if (s.solved) return TUTORIAL_STEP_COUNT;
  // A piece standing on end means rotation has been discovered.
  if (s.placed.some((p) => p.orientation === 1 || p.orientation === 3)) {
    return 3;
  }
  if (s.placed.length >= 1) return 2;
  if (s.selectedDominoId !== null) return 1;
  return 0;
}
