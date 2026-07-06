/**
 * Bump when regenerating assets/dictionary.txt — daily puzzles are
 * deterministic only against a fixed dictionary, and saved progress
 * records the version it was played against.
 */
export const DICT_VERSION = 1;

export const MIN_WORD_LEN = 3;
export const MAX_WORD_LEN = 10;

export interface Dictionary {
  /** Words bucketed by length: buckets[3] = all 3-letter words (sorted). */
  buckets: ReadonlyMap<number, readonly string[]>;
  /** 26-bit letter-set mask per word, aligned with buckets. */
  masks: ReadonlyMap<number, readonly number[]>;
  has(word: string): boolean;
}

export function letterMask(word: string): number {
  let mask = 0;
  for (let i = 0; i < word.length; i++) {
    mask |= 1 << (word.charCodeAt(i) - 97);
  }
  return mask;
}

export function parseDictionary(raw: string): Dictionary {
  const buckets = new Map<number, string[]>();
  const masks = new Map<number, number[]>();
  const all = new Set<string>();
  for (const line of raw.split("\n")) {
    const word = line.trim();
    if (!word) continue;
    const len = word.length;
    if (len < MIN_WORD_LEN || len > MAX_WORD_LEN) continue;
    let bucket = buckets.get(len);
    let maskList = masks.get(len);
    if (!bucket) {
      bucket = [];
      maskList = [];
      buckets.set(len, bucket);
      masks.set(len, maskList);
    }
    bucket.push(word);
    maskList!.push(letterMask(word));
    all.add(word);
  }
  return { buckets, masks, has: (word) => all.has(word) };
}

/**
 * All words of length `size` spellable from `letters` with reuse allowed:
 * word length matches and every letter of the word is in the set.
 */
export function enumerateWords(
  dict: Dictionary,
  letters: readonly string[],
  size: number,
): string[] {
  const setMask = letterMask(letters.join(""));
  const bucket = dict.buckets.get(size) ?? [];
  const maskList = dict.masks.get(size) ?? [];
  const out: string[] = [];
  for (let i = 0; i < bucket.length; i++) {
    if ((maskList[i] & ~setMask) === 0) out.push(bucket[i]);
  }
  return out;
}
