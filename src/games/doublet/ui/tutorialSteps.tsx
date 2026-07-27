import { Key } from "../../../components/CoachSheet";
import type { TutorialStep } from "../../../lib/tutorial/types";

/**
 * The tutorial script. Step three is the one worth the whole tutorial: the
 * board cannot be finished without turning a piece, so the rule is learned
 * by needing it rather than by being told.
 *
 * Bodies are two lines at the default text size — the banner's height
 * budget (TUTORIAL_BANNER_H) is sized for that.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Pick up a domino",
    body: (
      <>
        <Key>Tap</Key> one in the tray — or drag it straight to the board.
      </>
    ),
  },
  {
    title: "Drop it on the board",
    body: (
      <>
        Tap a <Key>cell</Key> to lay it. Tap a placed piece to lift it.
      </>
    ),
  },
  {
    title: "Turn it on end",
    body: (
      <>
        Tap <Key>Rotate</Key> to stand the picked-up domino upright. Some
        pieces only fit that way.
      </>
    ),
  },
  {
    title: "Rows and columns both",
    body: (
      <>
        Every run of two or more letters must spell a word, <Key>down</Key>{" "}
        as well as across.
      </>
    ),
  },
];

export const TUTORIAL_RECAP =
  "AM, US and GO across; MUG and SO down. A real day gives a bigger board and a fuller tray, in easy, medium or hard.";
