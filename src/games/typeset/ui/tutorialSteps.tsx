import { Key } from "../../../components/CoachSheet";
import type { TutorialStep } from "../../../lib/tutorial/types";

/**
 * One step per teaching set on the tutorial board (engine/tutorial.ts),
 * each introducing one idea. Bodies stay at two lines at the default
 * text size — TUTORIAL_BANNER_H is sized for that.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Find three that match but one way",
    body: (
      <>
        Three teal <Key>a</Key>’s, alike in all but <Key>fill</Key>. Tap all three.
      </>
    ),
  },
  {
    title: "Or three that differ every way",
    body: (
      <>
        Different letter, count, color <Key>and</Key> fill — that’s a set too.
      </>
    ),
  },
  {
    title: "Same or all different",
    body: (
      <>
        Check each of the four on its own: all <Key>same</Key> or all <Key>different</Key>.
      </>
    ),
  },
];

export const TUTORIAL_RECAP =
  "Letter, count, color and fill: for a set, each one is all the same or all different across the three cards.";
