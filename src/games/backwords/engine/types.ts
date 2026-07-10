/**
 * A placeable row. The player lays `place` against the mirror; the
 * reflection supplies the rest:
 *
 * - pair: `place` is a whole word laid left of the glass; the mirror
 *   spells its reversal (a different word) on the right. Consumes
 *   place.length letters. Both orientations are valid placements.
 * - palindrome: `place` is the first ceil(n/2) letters; the word
 *   straddles the glass (odd length: middle letter ON the line) and
 *   the mirror completes it. Consumes ceil(n/2) letters.
 */
export interface RowDef {
  kind: "pair" | "palindrome";
  /** Canonical placement (one orientation for pairs). */
  place: string;
  /** The dictionary word(s) the row realizes: [word, reversal] | [word]. */
  words: string[];
  /** Letters consumed from the bank (multiset, as a sorted string). */
  cost: string;
  /**
   * True mirror row: every glyph survives a real mirror (lowercase
   * self-symmetric letters plus b/d and p/q) — the ✦ flourish.
   */
  glyph: boolean;
}

export interface Puzzle {
  seed: string;
  dictVersion: number;
  /** The day's letters, sorted a-z. */
  bank: string[];
  /** Rows of one known solution (for tests/tuning; never shown). */
  seedRows: string[];
  /** How many distinct full decompositions exist (capped). */
  solutionCount: number;
  /** Distinct row-counts across solutions — ≥2 means real strategy. */
  rowCounts: number[];
}

/** Letter multiset helpers shared by the solver, reducer, and UI. */
export type Multiset = Record<string, number>;

export function toMultiset(letters: Iterable<string>): Multiset {
  const m: Multiset = {};
  for (const ch of letters) m[ch] = (m[ch] ?? 0) + 1;
  return m;
}

export function multisetSize(m: Multiset): number {
  return Object.values(m).reduce((a, b) => a + b, 0);
}

export function fitsIn(need: Multiset, bank: Multiset): boolean {
  return Object.entries(need).every(([ch, k]) => (bank[ch] ?? 0) >= k);
}

export function subtract(bank: Multiset, need: Multiset): Multiset {
  const out = { ...bank };
  for (const [ch, k] of Object.entries(need)) {
    out[ch] -= k;
    if (out[ch] <= 0) delete out[ch];
  }
  return out;
}
