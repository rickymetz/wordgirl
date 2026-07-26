import { Key } from "../../../components/CoachSheet";
import type { TutorialStep } from "../../../lib/tutorial/types";

/**
 * The tutorial script. Step three arrives exactly when the path needs its
 * first diagonal, which is the rule the grid alone never suggests.
 *
 * Bodies are two lines at the default text size — the banner's height
 * budget (TUTORIAL_BANNER_H) is sized for that.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Start the line",
    body: (
      <>
        Tap a cell to begin. The readout above fills in as you go.
      </>
    ),
  },
  {
    title: "Follow the letters",
    body: (
      <>
        Move to a <Key>touching</Key> cell to extend. Tap a placed cell to
        undo back to it.
      </>
    ),
  },
  {
    title: "Corners count too",
    body: (
      <>
        The next letter is <Key>diagonal</Key> — all eight neighbours are
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
];

export const TUTORIAL_RECAP =
  "A real day hides a line of poetry instead, on a bigger grid, with only the poem's title as a clue.";
