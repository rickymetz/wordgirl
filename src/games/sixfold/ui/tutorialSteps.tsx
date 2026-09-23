import { Key } from "../../../components/CoachSheet";
import type { TutorialStep } from "../../../lib/tutorial/types";

/**
 * The tutorial script, in the daily's own order: sudoku first, then the
 * stall, then the words. Every control a step names is on screen: the
 * cells, the letter keys, the clue card, the shading.
 *
 * Bodies are two lines at the default text size — the banner's height
 * budget (TUTORIAL_BANNER_H) is sized for that.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "One of each letter",
    body: (
      <>
        Every row, column and box holds each letter once. Four rows are
        missing <Key>one letter</Key> — tap each gap, then its letter.
      </>
    ),
  },
  {
    title: "Stuck? Use the words",
    body: (
      <>
        Sudoku can't tell which way around E and T go. The clue's answer
        fills the <Key>shaded row</Key>.
      </>
    ),
  },
  {
    title: "Finish the grid",
    body: (
      <>
        The <Key>shaded column</Key> spells another word from the same
        letters. Fill the last gaps.
      </>
    ),
  },
];

export const TUTORIAL_RECAP =
  "Sudoku first, then a word to break the stall. A real day has far more gaps, and two words to find.";
