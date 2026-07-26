import { Key } from "../../../components/CoachSheet";
import type { TutorialStep } from "../../../lib/tutorial/types";

/**
 * The tutorial script. Three rungs, because Backwords has three rules and
 * the third — that a palindrome is laid HALF-WAY — is the one no player
 * arrives at on their own.
 *
 * Bodies are two lines at the default text size — the banner's height
 * budget (TUTORIAL_BANNER_H) is sized for that.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Lay letters against the glass",
    body: (
      <>
        Tap or drag letters from the rack into the row.
      </>
    ),
  },
  {
    title: "The reflection is a word too",
    body: (
      <>
        The mirror spells your row <Key>backwards</Key>. Three of these
        letters make <Key>TOP</Key> — which reflects as POT.
      </>
    ),
  },
  {
    title: "Palindromes need only half",
    body: (
      <>
        Lay <Key>DA</Key> and the mirror finishes DAD. Solved when the rack
        is empty.
      </>
    ),
  },
];

export const TUTORIAL_RECAP =
  "Two rows, every letter spent. A real day deals eight to twelve letters and more than one way to break them up.";
