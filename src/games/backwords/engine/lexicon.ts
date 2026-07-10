import type { Dictionary } from "../../../lib/words/dictionary";
import { reverse, type RowDef } from "./types";

/**
 * Glyph mirror rules for UPPERCASE letterforms — the board renders
 * caps-only (font-game + uppercase), so the ✦ flourish must hold for
 * what the player actually sees: A H I M O T U V W X Y survive a
 * vertical mirror unchanged; no cap is another cap's mirror image
 * (lowercase b/d p/q tricks don't exist up here). A row is glyph-true
 * when its full visual reading is unchanged by a real mirror.
 */
const SELF = new Set(["a", "h", "i", "m", "o", "t", "u", "v", "w", "x", "y"]);

function glyphMirror(word: string): string | null {
  let out = "";
  for (let i = word.length - 1; i >= 0; i--) {
    const ch = word[i];
    if (!SELF.has(ch)) return null;
    out += ch;
  }
  return out;
}

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
    if (w === r) continue; // palindromes handled below, shortest first
    if (common.has(r) && !seenPair.has(r)) {
      seenPair.add(w);
      // ✦ when a REAL mirror would render exactly the reflection we
      // draw. In caps this is rare for pairs (WOT|TOW-shaped), common
      // for palindromes.
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

  // Palindromes, SHORTEST first: the canonical placement is the first
  // half (+ middle when odd), and every longer prefix through the full
  // word aliases to the same row — so when POP and POOP share the
  // half "po", typing on to POO (or POOP) reaches the longer word,
  // and typing any palindrome out in full simply commits it. Aliases
  // never overwrite an existing key.
  const palindromes = [...common]
    .filter((w) => w === reverse(w))
    .sort((a, b) => a.length - b.length || a.localeCompare(b));
  for (const w of palindromes) {
    const place = w.slice(0, Math.ceil(w.length / 2));
    const def: RowDef = {
      kind: "palindrome",
      place,
      words: [w],
      cost: sortLetters(place),
      glyph: glyphMirror(w) === w,
    };
    addPlacement(place, def);
    for (let n = place.length + 1; n <= w.length; n++) {
      const key = w.slice(0, n);
      if (!byPlace.has(key)) byPlace.set(key, def);
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
