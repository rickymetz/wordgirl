import { BOX_LAYOUT } from "./layouts";
import type { AnagridPuzzle } from "./types";

/**
 * The tutorial board: LISTEN across row 4, SILENT down column 5, and
 * everything else given except one 2×2 rectangle — (4,4) (4,5) (6,4)
 * (6,5), 1-based — whose E and T could swap either way as far as sudoku
 * is concerned. Only the clue settles it. That rectangle is the lesson:
 * it is the smallest honest case of "the words do real work".
 *
 * The script, in the order the rules stop being guessable:
 *   1. Row 1's one gap can only be S (a plain sudoku move).
 *   2. The clue's answer, LISTEN, fills row 4 — and fixes the rectangle.
 *   3. Column 5 spells another word from the same letters; finish it.
 *
 * Hand-picked, not generated: the daily generator minimizes givens, and
 * a first board wants the opposite. tutorial.test.ts re-checks every
 * claim above against the real solver, so the script can't drift into
 * teaching something the board doesn't do.
 */
export const TUTORIAL_PUZZLE: AnagridPuzzle = {
  letters: "eilnst",
  family: ["listen", "silent"],
  hiddenWord: "silent",
  cluedWord: "listen",
  clue: "Pay attention to a sound",
  row: 3,
  col: 4,
  layoutId: BOX_LAYOUT.id,
  regions: BOX_LAYOUT.regions,
  solution: "tlinsesenlitnteslilistenestinlinlets",
  givens: [
    0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 24, 25, 26, 27, 29,
    30, 31, 32, 35,
  ],
};

/** The first move: row 1's only gap. */
export const TUTORIAL_FIRST_CELL = 4;

/** How many steps the script has — the index that means "finished". */
export const TUTORIAL_STEP_COUNT = 3;

/**
 * Which step the board is on. Takes the fields it reads rather than the
 * reducer's GameState, so the engine stays free of state/ imports.
 */
export function tutorialStepIndex(s: {
  entries: string;
  solved: boolean;
}): number {
  if (s.solved) return TUTORIAL_STEP_COUNT;
  const p = TUTORIAL_PUZZLE;
  const row = s.entries.slice(p.row * 6, p.row * 6 + 6);
  // The row is the clue's step whether or not the S went in first — a
  // player who reads the clue early shouldn't be told to do it again.
  if (row === p.cluedWord) return 2;
  if (s.entries[TUTORIAL_FIRST_CELL] === p.solution[TUTORIAL_FIRST_CELL]) return 1;
  return 0;
}
