import { clueFor } from "./clues";
import { BOX_LAYOUT } from "./layouts";
import type { AnagridPuzzle } from "./types";

/**
 * The tutorial board teaches the daily's shape — sudoku first, then a
 * stall only a word breaks — at toy scale.
 *
 * LISTEN across row 4, SILENT down column 5, everything given except:
 * - four SUDOKU gaps, one in each of rows 1, 2, 3 and 5, each the only
 *   letter its row is missing (step 1);
 * - an E/T rectangle — (4,4) (4,5) (6,4) (6,5), 1-based — which sudoku
 *   can fill either way round. That is the stall (step 2), and the clue
 *   breaks it: LISTEN puts T then E in row 4. SILENT down agrees, and
 *   finishing it is step 3.
 *
 * Hand-picked, not generated. tutorial.test.ts re-checks every claim
 * above against the real solver and dictionary, so the script can't
 * drift into teaching something the board doesn't do.
 */
export const TUTORIAL_PUZZLE: AnagridPuzzle = {
  letters: "eilnst",
  family: ["listen", "silent"],
  hiddenWord: "silent",
  cluedWord: "listen",
  clue: clueFor("listen").text,
  row: 3,
  col: 4,
  layoutId: BOX_LAYOUT.id,
  regions: BOX_LAYOUT.regions,
  solution: "tlinsesenlitnteslilistenestinlinlets",
  givens: Array.from({ length: 36 }, (_, c) => c).filter(
    (c) => ![4, 7, 12, 26, 21, 22, 33, 34].includes(c),
  ),
};

/** Step 1's gaps: one per row, each forced by its row alone. */
export const TUTORIAL_SUDOKU_CELLS: readonly number[] = [4, 7, 12, 26];
/** Step 2's stall: the rectangle only a word settles. */
export const TUTORIAL_STALL_CELLS: readonly number[] = [21, 22, 33, 34];

/** How many steps the script has — the index that means "finished". */
export const TUTORIAL_STEP_COUNT = 3;

/**
 * Which step the board is on. Takes the fields it reads rather than the
 * reducer's GameState, so the engine stays free of state/ imports.
 */
export function tutorialStepIndex(s: { entries: string; solved: boolean }): number {
  if (s.solved) return TUTORIAL_STEP_COUNT;
  const p = TUTORIAL_PUZZLE;
  const right = (c: number) => s.entries[c] === p.solution[c];
  // The clue's row in means the stall is broken, whatever order the
  // player took — don't send them back to the sudoku gaps.
  if (right(21) && right(22)) return 2;
  if (TUTORIAL_SUDOKU_CELLS.every(right)) return 1;
  return 0;
}
