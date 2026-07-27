import { Key } from "../../../components/CoachSheet";
import type { TutorialStep } from "../../../lib/tutorial/types";

/**
 * The tutorial script. Two of the steps arrive at an exact moment in the
 * trace, because they describe what the board is doing right then: step
 * two when the path needs its first diagonal, step four when the letter it
 * needs shows on two touching cells and the line has closed one of them.
 * Those are the two rules the grid alone never suggests.
 *
 * Bodies are two lines at the default text size — the banner's height
 * budget (TUTORIAL_BANNER_H) is sized for that.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Follow the letters",
    body: (
      <>
        Each word's first letter is given. Move to a <Key>touching</Key>{" "}
        cell; tap a placed one to undo.
      </>
    ),
  },
  {
    title: "Corners count too",
    body: (
      <>
        The next letter is <Key>diagonal</Key> — all eight neighbors are
        fair game.
      </>
    ),
  },
  {
    title: "Cover every letter",
    body: (
      <>
        One unbroken line has to visit <Key>every cell</Key>.
      </>
    ),
  },
  {
    title: "The line never crosses",
    body: (
      <>
        Two <Key>E</Key>s touch the line. Only one is <Key>open</Key> — the
        other would cut across.
      </>
    ),
  },
];

export const TUTORIAL_RECAP =
  "A real day hides a line of poetry instead, on a bigger grid, with only the poem's title as a clue — and, like this one, every word's first letter given from the outset.";
