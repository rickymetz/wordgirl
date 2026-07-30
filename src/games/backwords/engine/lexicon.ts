import type { Dictionary } from "../../../lib/words/dictionary";
import { reverse, type RowDef } from "./types";

/**
 * Glyph mirror rules for UPPERCASE letterforms — the board renders
 * caps-only (font-game + uppercase), so the ✦ flourish must hold for
 * what the player actually sees: A H I M O T U V W X Y survive a
 * vertical mirror unchanged; no cap is another cap's mirror image
 * (lowercase b/d p/q tricks don't exist up here). A row is glyph-true
 * when its full visual reading is unchanged by a real mirror.
 *
 * KNOWN GAP, and please read before "fixing" it. This set describes the
 * DEFAULT face (Rubik Mono One). Settings offers an Accessible face
 * (Lexend), and Lexend's Y is NOT mirror-symmetric — its stem sits off
 * the axis of its arms. Overlaying every cap on its own mirror and
 * counting pixels that disagree: in Rubik the worst letter here scores
 * 0.069 (X, diagonal antialiasing) against 0.122 for the best letter
 * that ISN'T symmetric (Q) — clearly separated. In Lexend at the weight
 * the board uses, Y scores 0.214 against Q's 0.216, i.e. it is
 * indistinguishable from an asymmetric letter. Six of the 25 glyph-true
 * rows are affected: YAY, AY|YA, YO|OY, WAY|YAW, MAY|YAM, YAH|HAY.
 *
 * Left as it is on purpose. `glyphRows` is a lifetime stat, banked per
 * day and charted on the Trends page, so the flourish has to mean one
 * thing for one play — make this set depend on the active face and the
 * same solve counts differently per font, with the chart silently mixing
 * the two. Dropping Y instead would take the flourish off those six rows
 * for every player, in a face where it is true. So the claim is accurate
 * in the default face and slightly generous in the accessible one, which
 * is the least-bad of the three.
 *
 * Nothing else in the game reads letterforms: the generator never looks
 * at `glyph`, so no board, bank or puzzleKey depends on any of this.
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

/**
 * Everyday words the frequency-gated required tier misses, admitted to
 * THIS game's word set only.
 *
 * The required tier is ranked by subtitle frequency, which is a poor
 * proxy for "would a player accept this?" once the mirror constraint
 * bites: a row needs BOTH readings in the set, so every near-miss costs
 * a pair, and the survivors were 76 pairs and 34 palindromes — a move
 * space small enough to memorize in a fortnight (DEER|REED alone opened
 * a third of all days). Opening the reflection side to the whole
 * dictionary would fix the size and import ENABLE junk with it (SETON,
 * REGNA, DEETS) — exactly the trade dictionary v17 rolled back for
 * crosshatch. So this list is hand-picked instead, under one rule: BOTH
 * readings must be words an ordinary player accepts, because a mirror
 * row shows both.
 *
 * Every entry is already in the dictionary's bonus tier — this promotes
 * them for backwords, not globally, since "its reversal is a word" is a
 * daft reason to reshape the other four games' vocabulary.
 * `lexicon.test.ts` asserts each one still parses as a word, so a
 * dictionary change can't leave a typo here playing as real.
 */
export const MIRROR_WORDS: readonly string[] = [
  // Pair reflections, by the word this list adds (the other side is
  // already required-tier): MAY|YAM, WAY|YAW, PAY|YAP, BAG|GAB…
  "yam", "yaw", "yap", "gab", "sag", "nit", "nib", "mar", "dub", "lag",
  // …KNOW|WONK, TIME|EMIT, ROOM|MOOR, MEET|TEEM, GUNS|SNUG, NUTS|STUN.
  "wonk", "emit", "moor", "teem", "snug", "stun", "nori", "flog", "nips",
  "pans", "snot", "gulp", "edit", "wets", "ajar", "gnat", "snip", "yaws",
  "snub", "garb", "leer", "spat", "bonk", "gums",
  // The long mirrors are the reason to play at all, and not one of them
  // was reachable: STRAW|WARTS, LEVER|REVEL, DIAPER|REPAID, and the
  // eight-letter showpiece STRESSED|DESSERTS.
  "peels", "trams", "warts", "spans", "remit", "loots", "tubed", "revel",
  "sloop", "decaf", "knits", "serif", "lamina", "repaid", "reviled",
  "desserts",
  // Palindromes. A mirror game missing KAYAK, CIVIC, ROTOR and TENET is
  // missing its best material.
  "bib", "dud", "eke", "pup", "tot", "tut", "kook", "naan", "toot",
  "civic", "kayak", "rotor", "solos", "stats", "tenet", "redder",
  "reviver", "rotator",
];

/** The words backwords plays with: the common tier plus MIRROR_WORDS. */
export function commonWords(dict: Dictionary): Set<string> {
  const common = new Set<string>();
  for (const bucket of dict.required.buckets.values()) {
    for (const w of bucket) common.add(w);
  }
  // Gate on the dictionary: an entry that no longer parses as a word
  // must not play just because it is listed here.
  for (const w of MIRROR_WORDS) if (dict.has(w)) common.add(w);
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
