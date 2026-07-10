import type { Dictionary } from "../../../lib/words/dictionary";
import type { RowDef } from "./types";

/**
 * Glyph mirror rules (lowercase, as the board renders): letters that
 * survive a vertical mirror unchanged, plus the b/d and p/q pairs.
 * A row is glyph-true when its full visual reading is unchanged by a
 * real mirror — the ✦ flourish.
 */
const SELF = new Set(["i", "l", "m", "o", "t", "u", "v", "w", "x"]);
const FLIP: Record<string, string> = { b: "d", d: "b", p: "q", q: "p" };

function glyphMirror(word: string): string | null {
  let out = "";
  for (let i = word.length - 1; i >= 0; i--) {
    const ch = word[i];
    const m = FLIP[ch] ?? (SELF.has(ch) ? ch : null);
    if (m === null) return null;
    out += m;
  }
  return out;
}

const reverse = (w: string) => [...w].reverse().join("");
const sortLetters = (w: string) => [...w].sort().join("");

/** The COMMON tier as a flat set — the words backwords plays with. */
export function commonWords(dict: Dictionary): Set<string> {
  const common = new Set<string>();
  for (const bucket of dict.required.buckets.values()) {
    for (const w of bucket) common.add(w);
  }
  return common;
}

/**
 * The playable mirror lexicon, from the COMMON tier only (both the
 * generator and placement validation use this same list, so every
 * accepted day is solvable by the same rules the player plays under).
 *
 * Returned as a map from PLACEMENT string -> RowDef: pairs appear
 * under both orientations; palindromes under their visible half
 * (middle letter included for odd lengths).
 */
export function buildLexicon(dict: Dictionary): Map<string, RowDef> {
  const common = commonWords(dict);

  const byPlace = new Map<string, RowDef>();
  const addPlacement = (place: string, def: RowDef) => {
    // Collisions (kay -> kay|yak pair AND kayak half) cost the same
    // letters either way; the palindrome reading wins for display.
    const existing = byPlace.get(place);
    if (!existing || (def.kind === "palindrome" && existing.kind === "pair")) {
      byPlace.set(place, def);
    }
  };

  const seenPair = new Set<string>();
  for (const w of common) {
    const r = reverse(w);
    if (w === r) {
      // Palindrome: place the first half (+ middle when odd).
      const place = w.slice(0, Math.ceil(w.length / 2));
      addPlacement(place, {
        kind: "palindrome",
        place,
        words: [w],
        cost: sortLetters(place),
        glyph: glyphMirror(w) === w,
      });
    } else if (common.has(r) && !seenPair.has(r)) {
      seenPair.add(w);
      // ✦ when a REAL mirror would render exactly the reflection we
      // draw: physical mirror of "lit" reads "til"; of "loot", "tool".
      const glyph = glyphMirror(w) === r;
      for (const orientation of [w, r]) {
        addPlacement(orientation, {
          kind: "pair",
          place: orientation,
          words: [orientation, reverse(orientation)],
          cost: sortLetters(w),
          glyph,
        });
      }
    }
  }
  return byPlace;
}

/**
 * The distinct row OPTIONS for the solver: one entry per pair (not per
 * orientation) and one per palindrome, deduped by canonical identity.
 */
export function lexiconItems(byPlace: Map<string, RowDef>): RowDef[] {
  const seen = new Set<string>();
  const items: RowDef[] = [];
  for (const def of byPlace.values()) {
    const key = [...def.words].sort().join("/");
    if (!seen.has(key)) {
      seen.add(key);
      items.push(def);
    }
  }
  return items;
}
