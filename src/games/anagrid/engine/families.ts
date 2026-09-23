import type { Dictionary } from "../../../lib/words/dictionary";
import { N } from "./types";

/**
 * An anagram family: the common-tier N-letter words spelled with the
 * same N distinct letters. A family needs two members — one for the
 * diagonal, one for the clued row.
 */
export interface Family {
  /** The N letters, sorted. Doubles as the family's stable id. */
  letters: string;
  /** Common-tier members, alphabetical. */
  words: readonly string[];
}

/**
 * Bonus-tier words promoted into this game's answer pool, reviewed by
 * hand: everyday words the frequency cut left out. Empty until that
 * review happens — the measurement suite prints candidates.
 */
export const PROMOTED_WORDS: readonly string[] = [];

/**
 * Common-tier words that can't be a clued answer: proper nouns the
 * subtitle-frequency cut let in. Dropping one can orphan its family
 * (ADVISE loses DAVIES) — that's the point; a family needs two REAL
 * words.
 */
export const EXCLUDED_WORDS: ReadonlySet<string> = new Set([
  "davies",
  "fowler",
  "regina",
]);

function sortedLetters(word: string): string {
  return [...word].sort().join("");
}

function distinct(word: string): boolean {
  return new Set(word).size === word.length && /^[a-z]+$/.test(word);
}

export function anagramFamilies(dict: Dictionary): Family[] {
  const promoted = new Set(PROMOTED_WORDS);
  const groups = new Map<string, Set<string>>();
  const add = (w: string) => {
    if (w.length !== N || !distinct(w) || EXCLUDED_WORDS.has(w)) return;
    const key = sortedLetters(w);
    let g = groups.get(key);
    if (!g) groups.set(key, (g = new Set()));
    g.add(w);
  };
  for (const w of dict.required.buckets.get(N) ?? []) add(w);
  for (const w of dict.bonus.buckets.get(N) ?? []) if (promoted.has(w)) add(w);
  return [...groups]
    .filter(([, g]) => g.size >= 2)
    .map(([letters, g]) => ({ letters, words: [...g].sort() }))
    .sort((a, b) => (a.letters < b.letters ? -1 : a.letters > b.letters ? 1 : 0));
}

/**
 * Every dictionary word (BOTH tiers) spelled with these letters. This
 * is what a word line is allowed to be when checking uniqueness: a
 * player who knows AISLED shouldn't find a second valid grid the game
 * didn't account for, so uniqueness is proven against the full list
 * even though the answers themselves are common words.
 */
export function lineWords(dict: Dictionary, letters: string): string[] {
  const out: string[] = [];
  for (const tier of [dict.required, dict.bonus]) {
    for (const w of tier.buckets.get(N) ?? []) {
      if (sortedLetters(w) === letters) out.push(w);
    }
  }
  return [...new Set(out)].sort();
}

/**
 * Where a puzzle's two words sit:
 * - `diagonal`: the hidden word runs down the main diagonal, the clued
 *   word along a row. The row crosses the diagonal at (r, r), so the
 *   words share their letter at r — and ONLY there: row cell (r, j)
 *   sits in column j with diagonal cell (j, j), so at every other
 *   position the letters must differ. SACRED/SCARED agree in four
 *   places and can never pair; LADIES/IDEALS agree only at the S.
 * - `cross`: an across and a down, crossword-style — the clued word
 *   along row r, the hidden word down column c, meeting at (r, c).
 *   Row and column share no other cell, so any two family words pair
 *   wherever the across's letter c equals the down's letter r.
 */
export type Geometry = "diagonal" | "cross";

export interface Pairing {
  /** Unclued; revealed at the finish. */
  hiddenWord: string;
  hiddenCells: readonly number[];
  /** The clued line's answer. */
  cluedWord: string;
  cluedCells: readonly number[];
  row: number;
  /** The down's column under `cross`; -1 under `diagonal`. */
  col: number;
}

const rowOf = (r: number) => Array.from({ length: N }, (_, c) => r * N + c);
const colOf = (c: number) => Array.from({ length: N }, (_, r) => r * N + c);
const DIAG = Array.from({ length: N }, (_, i) => i * N + i);

export function pairings(family: Family, geometry: Geometry = "diagonal"): Pairing[] {
  const out: Pairing[] = [];
  for (const hidden of family.words) {
    for (const clued of family.words) {
      if (hidden === clued) continue;
      if (geometry === "diagonal") {
        const same: number[] = [];
        for (let i = 0; i < N; i++) if (hidden[i] === clued[i]) same.push(i);
        if (same.length !== 1) continue;
        const r = same[0];
        out.push({ hiddenWord: hidden, hiddenCells: DIAG, cluedWord: clued, cluedCells: rowOf(r), row: r, col: -1 });
      } else {
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            if (clued[c] !== hidden[r]) continue;
            out.push({ hiddenWord: hidden, hiddenCells: colOf(c), cluedWord: clued, cluedCells: rowOf(r), row: r, col: c });
          }
        }
      }
    }
  }
  return out;
}
