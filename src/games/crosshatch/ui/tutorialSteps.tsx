import { Key } from "../../../components/CoachSheet";
import type { TutorialStep } from "../../../lib/tutorial/types";

/**
 * The tutorial script. The last two steps carry the rule that makes
 * Crosshatch itself: a grid is not the answer, it is one of several, and
 * the day is swept by submitting more than one.
 *
 * Bodies are two lines at the default text size — the banner's height
 * budget (TUTORIAL_BANNER_H) is sized for that.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Fill the blanks",
    body: (
      <>
        Type into the empty cells. The <Key>padlocked</Key> letters never
        change.
      </>
    ),
  },
  {
    title: "Both lines must be words",
    body: (
      <>
        The crossing letter has to work <Key>both ways</Key>. Press{" "}
        <Key>Enter</Key>.
      </>
    ),
  },
  {
    title: "Change a line, submit again",
    body: (
      <>
        Banked. The counter is <Key>words found of the five</Key> this grid
        holds — all of them are needed.
      </>
    ),
  },
  {
    title: "Sweep them all",
    body: (
      <>
        So keep finding <Key>different</Key> valid grids until it reads 5/5.
      </>
    ),
  },
];

export const TUTORIAL_RECAP =
  "One frame, many right answers — a day is solved by finding every word the grid can hold, not just one filling.";
