import type { ReactNode } from "react";

/**
 * One rung of a game's tutorial script. A tutorial is an ordinary game
 * screen playing a hand-picked puzzle, with this list walked alongside
 * it: nothing is locked, so a step simply doesn't advance until the
 * player has done the thing it describes.
 *
 * Order is the whole point — step 1 is the single simplest interaction
 * the game has, and each later step introduces exactly one more rule.
 */
export interface TutorialStep {
  /** Micro-headline, e.g. "Build a word". */
  title: string;
  /** One-liner. `Key` from CoachSheet works here for emphasis. */
  body: ReactNode;
}

/**
 * Which step a state is on: the number of steps already satisfied, so
 * `steps.length` means the script is finished. Each game derives this
 * in its engine (pure, testable) from its own reducer state.
 */
export type TutorialStepIndex = number;
