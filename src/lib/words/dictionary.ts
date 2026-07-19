/**
 * Bump when regenerating assets/dictionary.txt — daily puzzles are
 * deterministic only against a fixed dictionary, and saved progress
 * records the version it was played against.
 *
 * v2: two tiers — common REQUIRED words gate advancement; rarer BONUS
 * words ("+"-prefixed lines) score extra but are never required.
 * v3: allowlist puzzle staples (ode &c.) into the required tier
 * whatever their frequency rank; drop mild words from the blocklist.
 * v4: crosshatch generator never fully locks a line (also guards
 * generator-behavior changes, not just dictionary contents).
 * v5: crosshatch progress counts distinct WORDS, not combos — the
 * generator band and save shape changed with it.
 * v6: buckets keep subtitle-frequency order (commonest first within
 * each length); polygram sorts its display lists itself now.
 * v7: blocklist subtitle name-junk, allowlist everyday concrete words,
 * and cap any one crosshatch line's share of a day's words.
 * v8: allowlist mirror-word staples (dab) into the required tier so
 * their reversal pairs (bad|dab) play in backwords.
 * v9: blocklist junk reversals and name-palindromes (tae, nam, deb,
 * pam, tis, ana) that backwords' mirror rows would teach as words.
 * v10: backwords palindrome prefix aliases — the shadowed even
 * palindromes (poop, peep) join the item pool, changing puzzle
 * derivation without a dictionary.txt change.
 * v11: full ENABLE coverage — every valid Scrabble word (3–10 chars)
 * is now in the dictionary. Required tier is still frequency-gated;
 * all remaining ENABLE words are bonus. Replaces the v11 suffix-
 * expansion approach with complete Scrabble/crossword coverage.
 * v13: promote doze, ooze, skied, misdeed, missive from bonus to
 * required tier — common words players expect to be accepted.
 * v14: crosshatch accepts bonus-tier words; polygram removes the
 * per-level bonus cap — all spellable bonus words are now offered.
 * v15: remove 20-cell hard boards (h2, h4) from doublet — their
 * solution-count verification froze mobile browsers.
 * v16: reshape doublet's e5 easy board (T-bar -> staircase) — the
 * T-bar's checkerboard color classes were 4/2, so it had no domino
 * tiling and every attempt that selected it failed.
 */
export const DICT_VERSION = 16;

const MIN_WORD_LEN = 2;
const MAX_WORD_LEN = 10;

type Tier = "required" | "bonus";

interface TierIndex {
  /** Words bucketed by length: buckets[3] = all 3-letter words (sorted). */
  buckets: ReadonlyMap<number, readonly string[]>;
  /** 26-bit letter-set mask per word, aligned with buckets. */
  masks: ReadonlyMap<number, readonly number[]>;
}

export interface Dictionary {
  required: TierIndex;
  bonus: TierIndex;
  /** Required + bonus merged into one index (for games that accept both). */
  all: TierIndex;
  has(word: string): boolean;
}

export function letterMask(word: string): number {
  let mask = 0;
  for (let i = 0; i < word.length; i++) {
    mask |= 1 << (word.charCodeAt(i) - 97);
  }
  return mask;
}

function makeTier(): {
  buckets: Map<number, string[]>;
  masks: Map<number, number[]>;
} {
  return { buckets: new Map(), masks: new Map() };
}

export function parseDictionary(raw: string): Dictionary {
  const tiers = { required: makeTier(), bonus: makeTier() };
  const allWords = new Set<string>();
  for (const line of raw.split("\n")) {
    let word = line.trim();
    if (!word) continue;
    const tier = word.startsWith("+") ? "bonus" : "required";
    if (tier === "bonus") word = word.slice(1);
    const len = word.length;
    if (len < MIN_WORD_LEN || len > MAX_WORD_LEN) continue;
    const t = tiers[tier];
    let bucket = t.buckets.get(len);
    let maskList = t.masks.get(len);
    if (!bucket) {
      bucket = [];
      maskList = [];
      t.buckets.set(len, bucket);
      t.masks.set(len, maskList);
    }
    bucket.push(word);
    maskList!.push(letterMask(word));
    allWords.add(word);
  }
  const merged = mergeTiers(tiers.required, tiers.bonus);
  return {
    required: tiers.required,
    bonus: tiers.bonus,
    all: merged,
    has: (word) => allWords.has(word),
  };
}

function mergeTiers(a: TierIndex, b: TierIndex): TierIndex {
  const buckets = new Map<number, readonly string[]>();
  const masks = new Map<number, readonly number[]>();
  const lengths = new Set([...a.buckets.keys(), ...b.buckets.keys()]);
  for (const len of lengths) {
    const ab = a.buckets.get(len) ?? [];
    const bb = b.buckets.get(len) ?? [];
    const am = a.masks.get(len) ?? [];
    const bm = b.masks.get(len) ?? [];
    buckets.set(len, [...ab, ...bb]);
    masks.set(len, [...am, ...bm]);
  }
  return { buckets, masks };
}

/**
 * All words of length `size` spellable from `letters` with reuse allowed:
 * word length matches and every letter of the word is in the set.
 */
export function enumerateWords(
  dict: Dictionary,
  letters: readonly string[],
  size: number,
  tier: Tier = "required",
): string[] {
  const setMask = letterMask(letters.join(""));
  const index = dict[tier];
  const bucket = index.buckets.get(size) ?? [];
  const maskList = index.masks.get(size) ?? [];
  const out: string[] = [];
  for (let i = 0; i < bucket.length; i++) {
    if ((maskList[i] & ~setMask) === 0) out.push(bucket[i]);
  }
  return out;
}
