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
 */
export const DICT_VERSION = 4;

export const MIN_WORD_LEN = 3;
export const MAX_WORD_LEN = 10;

export type Tier = "required" | "bonus";

interface TierIndex {
  /** Words bucketed by length: buckets[3] = all 3-letter words (sorted). */
  buckets: ReadonlyMap<number, readonly string[]>;
  /** 26-bit letter-set mask per word, aligned with buckets. */
  masks: ReadonlyMap<number, readonly number[]>;
}

export interface Dictionary {
  required: TierIndex;
  bonus: TierIndex;
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
  const all = new Set<string>();
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
    all.add(word);
  }
  return {
    required: tiers.required,
    bonus: tiers.bonus,
    has: (word) => all.has(word),
  };
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
