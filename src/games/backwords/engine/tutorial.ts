import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { Puzzle } from "./types";

/**
 * The tutorial bank: five letters, which sort to ADOPT.
 *
 * It decomposes exactly ONE way — TOP|POT plus DAD — which is the whole
 * point. The daily generator would reject it outright (its floor is eight
 * letters and it insists on two or more decompositions so strategy is
 * real), but a tutorial wants the opposite: one right answer, reached in
 * two moves, each teaching a different half of the rule.
 *
 *   TOP against the glass  ->  the mirror reads POT   (a pair)
 *   DA  against the glass  ->  the mirror finishes DAD (a palindrome)
 *
 * The pair may be laid from either side (POT works as well as TOP), so
 * the first move is forgiving; the palindrome then teaches the part
 * nobody guesses — that you lay only its first half.
 *
 * tutorial.test.ts re-derives this from the real lexicon and asserts the
 * decomposition is still unique, so a dictionary change can't quietly
 * turn the tutorial into a puzzle with a second answer.
 */
export const TUTORIAL_PUZZLE: Puzzle = {
  seed: "tutorial",
  dictVersion: DICT_VERSION,
  bank: ["a", "d", "o", "p", "t"],
  seedRows: ["top", "da"],
  solutionCount: 1,
  rowCounts: [2],
  // The one decomposition IS par. Day-scale chrome stays hidden in the
  // tutorial anyway — a par of 2 over five letters measures nothing.
  parRows: 2,
};

/** How many steps the script has — the index that means "finished". */
export const TUTORIAL_STEP_COUNT = 3;

/**
 * Which step the board is on. Takes the fields it reads rather than the
 * reducer's GameState, so the engine stays free of state/ imports.
 */
export function tutorialStepIndex(s: {
  current: string;
  rows: readonly { def: { kind: "pair" | "palindrome" } }[];
  solved: boolean;
}): number {
  if (s.solved) return TUTORIAL_STEP_COUNT;
  // Move on to the palindrome lesson only once the PAIR is actually down.
  // Nothing stops a player laying DA first, and if they do, the step that
  // still helps is the one naming TOP — not one telling them to do what
  // they just did.
  if (s.rows.some((r) => r.def.kind === "pair")) return 2;
  if (s.current.length >= 1) return 1;
  return 0;
}
