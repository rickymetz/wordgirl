import { seededRandom, shuffle } from "../../../lib/random";
import type { Dictionary } from "../../../lib/words/dictionary";
import { DICT_VERSION, enumerateWords } from "../../../lib/words/dictionary";
import { requiredWords } from "./completion";
import type { LevelSpec, Puzzle } from "./types";

/**
 * Per-level word-count ceilings. "Find ALL words" is the advancement gate,
 * so these keep any single level from becoming a slog. Tuned against real
 * generator output (see generator.test.ts sweep).
 */
export const LEVEL_CAPS: Record<number, number> = {
  3: 8,
  4: 10,
  5: 10,
  6: 8,
  7: 6,
  8: 5,
  9: 4,
  10: 3,
};

/** A puzzle must reach at least the pentagon to feel like a journey. */
export const MIN_MAX_LEVEL = 5;
/** Total-word ceiling across all levels (required tier). */
export const MAX_TOTAL_WORDS = 35;

/**
 * Required-word floor per level. Single-word high levels ("find exactly
 * 'ecosystem' from nine blanks") give no partial traction — demand at
 * least two from the heptagon up.
 */
export function minWords(size: number): number {
  return size >= 7 ? 2 : 1;
}

const MAX_ATTEMPTS = 300;

// Rough English letter frequencies for padding the seed letters.
const LETTER_POOL = "eeeeaaaarrriiioootttnnsslcudpmhgbfywkvxzjq";

export function dailySeed(dateKey: string): string {
  return `daily:${dateKey}`;
}

export function practiceSeed(random: string): string {
  return `practice:${random}`;
}

/**
 * Deterministic puzzle generation: the same seed and dictionary always
 * produce the same puzzle. PRNG consumption order must stay stable —
 * change it only alongside a DICT_VERSION-style versioning of seeds.
 */
export function generatePuzzle(dict: Dictionary, seed: string): Puzzle {
  const rand = seededRandom(`polygram:v1:${seed}`);
  const threeLetterWords = dict.required.buckets.get(3) ?? [];
  if (threeLetterWords.length === 0) {
    throw new Error("dictionary has no 3-letter words");
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const letters = pickSeedLetters(threeLetterWords, rand);
    const levels: LevelSpec[] = [];

    const triangleWords = enumerateWords(dict, letters, 3).sort();
    if (triangleWords.length < 1 || triangleWords.length > LEVEL_CAPS[3]) {
      continue;
    }
    // Every starting letter must appear in at least one triangle word.
    if (!letters.every((l) => triangleWords.some((w) => w.includes(l)))) {
      continue;
    }
    levels.push({
      size: 3,
      words: triangleWords,
      bonusWords: enumerateWords(dict, letters, 3, "bonus"),
    });

    // Grow one letter at a time; stop at the first size with no viable letter.
    for (let size = 4; size <= 10; size++) {
      const cap = LEVEL_CAPS[size];
      const candidates = shuffle(
        [..."abcdefghijklmnopqrstuvwxyz"].filter((c) => !letters.includes(c)),
        rand,
      );
      let found = false;
      for (const candidate of candidates) {
        const extended = [...letters, candidate];
        const words = enumerateWords(dict, extended, size).sort();
        if (
          words.length >= minWords(size) &&
          words.length <= cap &&
          // The debuting letter must be used by at least one word on
          // the level that introduces it.
          words.some((w) => w.includes(candidate))
        ) {
          letters.push(candidate);
          levels.push({
            size,
            words,
            bonusWords: enumerateWords(dict, extended, size, "bonus"),
          });
          found = true;
          break;
        }
      }
      if (!found) break;
    }

    // The band is on the REQUIRED words — what the day demands. The
    // bonus tier is optional and does not count against it.
    const required = requiredWords(levels);
    const maxLevel = levels[levels.length - 1].size;
    if (maxLevel < MIN_MAX_LEVEL || required > MAX_TOTAL_WORDS) continue;

    for (const level of levels) level.bonusWords.sort();

    return {
      seed,
      dictVersion: DICT_VERSION,
      letters,
      levels,
      maxLevel,
      requiredWords: requiredWords(levels),
    };
  }

  throw new Error(`could not generate puzzle for seed "${seed}"`);
}

/** Three distinct letters: a random 3-letter word's letters, padded if needed. */
function pickSeedLetters(
  threeLetterWords: readonly string[],
  rand: () => number,
): string[] {
  const word = threeLetterWords[Math.floor(rand() * threeLetterWords.length)];
  const letters = [...new Set(word)];
  while (letters.length < 3) {
    const c = LETTER_POOL[Math.floor(rand() * LETTER_POOL.length)];
    if (!letters.includes(c)) letters.push(c);
  }
  return letters;
}
