import { Key } from "../../../components/CoachSheet";
import type { TutorialStep } from "../../../lib/tutorial/types";

/**
 * The tutorial script: a sudoku move, then the clue, then the hidden
 * word — the order the rules stop being guessable. Every control a step
 * names is on screen: the cells, the letter keys, the clue card.
 *
 * Bodies are two lines at the default text size — the banner's height
 * budget (TUTORIAL_BANNER_H) is sized for that.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "One of each letter",
    body: (
      <>
        Every row, column and box holds each letter once. Row 1 is missing
        only <Key>S</Key> — tap its gap, then S.
      </>
    ),
  },
  {
    title: "Solve the clue",
    body: (
      <>
        The clue's answer fills the <Key>marked row</Key>. Sudoku alone
        can't place its E and T — the word can.
      </>
    ),
  },
  {
    title: "Find the hidden word",
    body: (
      <>
        The <Key>shaded column</Key> spells another word from the same
        letters. Fill it, then the one gap left.
      </>
    ),
  },
];

export const TUTORIAL_RECAP =
  "LISTEN across, SILENT down. A real day gives fewer letters, and the hidden word is yours to find.";
