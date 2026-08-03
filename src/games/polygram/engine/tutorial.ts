import { DICT_VERSION } from "../../../lib/words/dictionary";
import { requiredWords } from "./completion";
import type { LevelSpec, Puzzle } from "./types";

/**
 * The tutorial puzzle: two levels, five everyday words, no bonus words.
 *
 * Hand-picked rather than generated, because the generator's bands are
 * tuned for a day's play — it demands at least a pentagon and would
 * never produce a level this small. The letters O R W were chosen so the
 * triangle holds exactly three words, two of which (WOO, WOW) reuse a
 * shape — the one rule players reliably guess wrong. Adding N then gives
 * exactly two four-letter words, so the square is a short second act
 * rather than a wall.
 *
 * The word lists are EXHAUSTIVE for these letters in the required tier
 * (tutorial.test.ts re-enumerates them against the real dictionary): a
 * word the player can legitimately spell but that is missing here would
 * come back "not a word", which teaches a lie.
 */
const TUTORIAL_LEVELS: LevelSpec[] = [
  { size: 3, words: ["row", "woo", "wow"], bonusWords: [] },
  { size: 4, words: ["noon", "worn"], bonusWords: [] },
];

/** letters[0..2] ring the triangle; letters[3] joins at the square. */
export const TUTORIAL_LETTERS = ["o", "r", "w", "n"];

/** How many steps the script has — the index that means "finished". */
export const TUTORIAL_STEP_COUNT = 4;

export const TUTORIAL_PUZZLE: Puzzle = {
  seed: "tutorial",
  dictVersion: DICT_VERSION,
  letters: TUTORIAL_LETTERS,
  levels: TUTORIAL_LEVELS,
  maxLevel: 4,
  requiredWords: requiredWords(TUTORIAL_LEVELS),
};

/**
 * Which step the board is on: the count of steps already satisfied, so
 * TUTORIAL_STEP_COUNT means the script is finished.
 *
 * Takes the fields it reads rather than the reducer's GameState, so the
 * engine stays free of state/ imports.
 */
export function tutorialStepIndex(s: {
  current: string;
  found: readonly string[];
  levelIndex: number;
  phase: string;
}): number {
  if (s.phase === "done") return TUTORIAL_STEP_COUNT;
  // "levelClear" is the beat between clearing the triangle and tapping
  // through to the square — the new-letter lesson starts there.
  if (s.levelIndex >= 1 || s.phase === "levelClear") return 3;
  if (s.found.length >= 1) return 2;
  if (s.current.length > 0) return 1;
  return 0;
}
