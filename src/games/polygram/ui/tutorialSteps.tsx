import { Key } from "../../../components/CoachSheet";
import type { TutorialStep } from "../../../lib/tutorial/types";

/**
 * The tutorial script, in the order the rules stop being guessable:
 * build, submit, sweep the level (letters repeat), then the polygon
 * growing under you. Kept beside the coach copy rather than in engine/,
 * which stays React-free.
 *
 * Bodies are two lines at the default text size — the banner's height
 * budget (TUTORIAL_BANNER_H) is sized for that.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Spell a word",
    body: (
      <>
        Tap the <Key>outer shapes</Key> to build a three-letter word.
      </>
    ),
  },
  {
    title: "Submit at the center",
    body: (
      <>
        Tap the <Key>center shape</Key> to enter it.
      </>
    ),
  },
  {
    title: "Find all three",
    body: (
      <>
        Letters <Key>can repeat</Key> — a word may use a shape twice.
      </>
    ),
  },
  {
    title: "The flock grows",
    body: (
      <>
        A <Key>new letter</Key> joined. Words are now four letters.
      </>
    ),
  },
];

export const TUTORIAL_RECAP =
  "Sweep every word at a level, take the new letter, keep climbing the polygons.";
