/**
 * The tutorial's hand-picked board. It bypasses the schedule and the
 * dealer (whose 4–8 set bounds are tuned for a day's play) and lives in
 * its own module so nothing here can shift a daily seed.
 *
 * Nine cards, exactly three sets, and four steps:
 *  1. a set where everything matches but the fill
 *  2. NOT a set: both RRR cards and the single gold R — counts 3, 3, 1,
 *     the two-alike-one-different pick newcomers actually make (step done
 *     on any miss)
 *  3. a set where everything differs
 *  4. a mix — two attributes the same, two different
 * tutorial.test.ts asserts there are no other sets on the board, so a
 * player following the steps can't stumble into a fourth.
 */
import { CHARSET_POOL } from "./pool";
import type { Board } from "./schedule";
import { findSets, tripleKey, type Card } from "./sets";

const LETTERS = CHARSET_POOL[0];

/** The three teaching sets, in step order. */
export const TUTORIAL_SETS: readonly (readonly [Card, Card, Card])[] = [
  [
    [0, 0, 2, 0],
    [0, 0, 2, 1],
    [0, 0, 2, 2],
  ],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [2, 2, 2, 2],
  ],
  [
    [2, 0, 1, 0],
    [2, 1, 1, 1],
    [2, 2, 1, 2],
  ],
];

/** Board positions: shuffled by hand so no set sits in a row. */
const ORDER = [0, 3, 6, 4, 1, 7, 8, 5, 2];

const cards: Card[] = ORDER.map((i) => TUTORIAL_SETS[Math.floor(i / 3)][i % 3]);

export const TUTORIAL_BOARD: Board = {
  kind: "charset",
  label: LETTERS.theme,
  glyphs: LETTERS.chars.map((c) => ({ char: c.char, face: LETTERS.face, name: c.name, plural: c.plural })) as unknown as Board["glyphs"],
  cards,
  sets: findSets(cards),
};

export const TUTORIAL_BOARDS: readonly Board[] = [TUTORIAL_BOARD];

/** The teaching sets as board triples, in step order. */
export const TUTORIAL_TARGETS: readonly string[] = TUTORIAL_SETS.map((set) =>
  tripleKey(set.map((card) => cards.findIndex((c) => c.join() === card.join()))),
);

/** The near-miss step 2 asks for: both RRR cards and the single gold R. */
export const TUTORIAL_NOT_A_SET: Card[] = [
  [2, 2, 2, 2],
  [2, 2, 1, 2],
  [2, 0, 1, 0],
];

/** Three sets plus the not-a-set step. */
export const TUTORIAL_STEP_COUNT = TUTORIAL_TARGETS.length + 1;

/**
 * The step the player is on (TUTORIAL_STEP_COUNT once done). Step 1 until
 * the first set is found; then step 2, the not-a-set pick, until the player
 * has missed once (a miss before that counts: they have met "Not a set");
 * then the remaining sets in order. Any order of finding works; the banner
 * always teaches the earliest step still open.
 */
export function tutorialStepIndex(found: readonly string[], misses = 0): number {
  if (!found.includes(TUTORIAL_TARGETS[0])) return 0;
  if (misses === 0) return 1;
  const i = TUTORIAL_TARGETS.findIndex((t) => !found.includes(t));
  return i === -1 ? TUTORIAL_STEP_COUNT : i + 1;
}
