/**
 * The vetted pool the daily schedule draws from. Two independent lists,
 * one per board:
 *
 *  - CHARSET_POOL: a theme, a face, and three characters set in it. The
 *    glyph attribute is "which character".
 *  - FACES_POOL: one character set in three faces from three different
 *    families. The glyph attribute is "which face".
 *
 * APPEND-ONLY, and only with a FUTURE `since` (a cycle index; see
 * schedule.ts). Editing, removing or reordering an entry, or appending
 * with a `since` at or before the current cycle, reshuffles past days and
 * strands archive saves. schedule.test.ts pins a run of days so that
 * can't happen silently.
 *
 * Vetting rules (pool.test.ts enforces what it can):
 *  - three characters with clearly different silhouettes; no digits
 *    (three 2s read as a count) and no lookalikes (l I 1, O 0)
 *  - every character exists in its face (the bake script fails if not)
 *  - a faces trio takes three different SILHOUETTES (serif, slab, sans,
 *    mono, script), not just three families; a trio with the monospace
 *    uses a letter that shows it (MONO_TELLING)
 *  - MEASURED, not labeled (legibility.test.ts, from the baked outlines):
 *    every stroke thick enough to show the cross-hatch at phone size, and
 *    no two faces on a board drawing their letter alike. A family label
 *    says nothing about one letter: an "e" has no serifs, so a serif face
 *    and a sans can draw it the same.
 *
 * A failing entry that has not been played yet may be fixed IN PLACE: the
 * shuffle orders entries by position, so changing an entry's content moves
 * only the days that deal it, and the puzzle key (which names the glyphs)
 * sends any save for those days down the stale path.
 */
import type { FaceId } from "./faces";

export type Theme = "Letters" | "Symbols" | "Currency" | "Beyond A–Z";

export interface CharacterSpec {
  char: string;
  /** Screen-reader name, singular and plural ("euro sign", "euro signs"). */
  name: string;
  plural: string;
}

export interface CharsetEntry {
  theme: Theme;
  face: FaceId;
  chars: readonly [CharacterSpec, CharacterSpec, CharacterSpec];
  since: number;
}

export interface FacesEntry {
  char: CharacterSpec;
  faces: readonly [FaceId, FaceId, FaceId];
  since: number;
}

const ch = (char: string, name: string, plural = `${name}s`): CharacterSpec => ({ char, name, plural });
const letter = (char: string): CharacterSpec => ch(char, char, `${char}'s`);

export const CHARSET_POOL: readonly CharsetEntry[] = [
  { theme: "Letters", face: "jost", chars: [letter("a"), letter("g"), letter("R")], since: 0 },
  // Was "#", whose hairline bars were too thin to show the cross-hatch
  // (legibility.test.ts). Changed on launch day, before any later day played.
  { theme: "Symbols", face: "fraunces", chars: [ch("&", "ampersand"), ch("@", "at sign"), ch("?", "question mark")], since: 0 },
  { theme: "Currency", face: "fraunces", chars: [ch("$", "dollar sign"), ch("€", "euro sign"), ch("¥", "yen sign")], since: 0 },
  { theme: "Beyond A–Z", face: "eb-garamond", chars: [ch("ß", "sharp s", "sharp s's"), ch("Æ", "ash", "ashes"), ch("Ø", "slashed O", "slashed O's")], since: 0 },
  { theme: "Letters", face: "fraunces", chars: [letter("Q"), letter("e"), letter("k")], since: 0 },
  { theme: "Symbols", face: "eb-garamond", chars: [ch("?", "question mark"), ch("¶", "pilcrow"), ch("§", "section sign")], since: 0 },
  { theme: "Currency", face: "literata", chars: [ch("£", "pound sign"), ch("₹", "rupee sign"), ch("₩", "won sign")], since: 0 },
  { theme: "Beyond A–Z", face: "literata", chars: [ch("α", "alpha"), ch("γ", "gamma"), ch("ξ", "xi")], since: 0 },
  { theme: "Letters", face: "eb-garamond", chars: [letter("G"), letter("a"), letter("y")], since: 0 },
  { theme: "Symbols", face: "jost", chars: [ch("%", "percent sign"), ch("&", "ampersand"), ch("?", "question mark")], since: 0 },
  { theme: "Currency", face: "eb-garamond", chars: [ch("$", "dollar sign"), ch("£", "pound sign"), ch("¥", "yen sign")], since: 0 },
  { theme: "Beyond A–Z", face: "fraunces", chars: [ch("Þ", "thorn"), ch("ð", "eth"), ch("Œ", "OE ligature", "OE ligatures")], since: 0 },
  { theme: "Letters", face: "literata", chars: [letter("R"), letter("b"), letter("s")], since: 0 },
  { theme: "Symbols", face: "literata", chars: [ch("#", "number sign"), ch("?", "question mark"), ch("&", "ampersand")], since: 0 },
  { theme: "Currency", face: "roboto-slab", chars: [ch("¢", "cent sign"), ch("€", "euro sign"), ch("¥", "yen sign")], since: 0 },
  { theme: "Beyond A–Z", face: "literata", chars: [ch("λ", "lambda"), ch("Ω", "omega"), ch("ψ", "psi")], since: 0 },
  { theme: "Letters", face: "roboto-slab", chars: [letter("h"), letter("e"), letter("y")], since: 0 },
  { theme: "Symbols", face: "archivo-black", chars: [ch("!", "exclamation mark"), ch("@", "at sign"), ch("%", "percent sign")], since: 0 },
  { theme: "Letters", face: "archivo-black", chars: [letter("A"), letter("g"), letter("s")], since: 0 },
  // Faces that had never set a character board (review: the pool leaned on
  // Fraunces, EB Garamond and Literata). Each vetted in all three fills at
  // card size; Bodoni's dagger, Literata's asterism and Kaushan's thin
  // glyphs broke up under the hatch and were left out.
  { theme: "Symbols", face: "bodoni-moda", chars: [ch("‽", "interrobang"), ch("¶", "pilcrow"), ch("&", "ampersand")], since: 0 },
  { theme: "Symbols", face: "lobster", chars: [ch("&", "ampersand"), ch("@", "at sign"), ch("§", "section sign")], since: 0 },
  { theme: "Symbols", face: "jetbrains-mono", chars: [ch("#", "number sign"), ch("%", "percent sign"), ch("&", "ampersand")], since: 0 },
  { theme: "Currency", face: "lobster", chars: [ch("$", "dollar sign"), ch("€", "euro sign"), ch("¥", "yen sign")], since: 0 },
  { theme: "Currency", face: "jetbrains-mono", chars: [ch("$", "dollar sign"), ch("₽", "ruble sign"), ch("¢", "cent sign")], since: 0 },
  { theme: "Currency", face: "jost", chars: [ch("₽", "ruble sign"), ch("£", "pound sign"), ch("$", "dollar sign")], since: 0 },
  { theme: "Beyond A–Z", face: "roboto-slab", chars: [ch("Ŋ", "eng"), ch("Ħ", "H with stroke", "Hs with stroke"), ch("Þ", "thorn")], since: 0 },
  { theme: "Beyond A–Z", face: "bodoni-moda", chars: [ch("Œ", "OE ligature", "OE ligatures"), ch("ß", "sharp s", "sharp s's"), ch("Ł", "L with stroke", "Ls with stroke")], since: 0 },
  { theme: "Letters", face: "bodoni-moda", chars: [letter("Q"), letter("a"), letter("k")], since: 0 },
  { theme: "Letters", face: "lobster", chars: [letter("G"), letter("e"), letter("k")], since: 0 },
  { theme: "Letters", face: "jost", chars: [letter("M"), letter("y"), letter("s")], since: 0 },
];

export const FACES_POOL: readonly FacesEntry[] = [
  { char: letter("g"), faces: ["eb-garamond", "jost", "lobster"], since: 0 },
  { char: letter("a"), faces: ["bodoni-moda", "jost", "kaushan-script"], since: 0 },
  { char: letter("R"), faces: ["bodoni-moda", "archivo-black", "roboto-slab"], since: 0 },
  { char: letter("Q"), faces: ["eb-garamond", "jost", "roboto-slab"], since: 0 },
  // "l": JetBrains Mono's hooked, footed l is the one that shows a monospace
  // (its y, f and r read as a grotesque; see MONO_TELLING), and Lobster's l
  // has no closed loop to fill in on a solid card (its f did).
  { char: letter("l"), faces: ["fraunces", "jetbrains-mono", "lobster"], since: 0 },
  { char: ch("&", "ampersand"), faces: ["eb-garamond", "archivo-black", "lobster"], since: 0 },
  // Was Literata: an "e" has no serifs to show, and Literata's drew as
  // Jost's near twin (legibility.test.ts). Bodoni's stress parts them.
  { char: letter("e"), faces: ["bodoni-moda", "jost", "lobster"], since: 0 },
  { char: letter("k"), faces: ["jost", "roboto-slab", "kaushan-script"], since: 0 },
  { char: letter("G"), faces: ["bodoni-moda", "roboto-slab", "lobster"], since: 0 },
  { char: letter("y"), faces: ["literata", "archivo-black", "lobster"], since: 0 },
  { char: letter("M"), faces: ["eb-garamond", "roboto-slab", "jost"], since: 0 },
  { char: letter("j"), faces: ["jost", "jetbrains-mono", "lobster"], since: 0 },
  { char: letter("b"), faces: ["fraunces", "archivo-black", "lobster"], since: 0 },
  // Was W (Literata, Roboto Slab, Lobster): Lobster's W is too thin for the
  // hatch (legibility.test.ts), as was every script W tried, and without a
  // script the serif and slab W read as twins.
  { char: letter("d"), faces: ["eb-garamond", "archivo-black", "lobster"], since: 0 },
  { char: letter("k"), faces: ["bodoni-moda", "jost", "lobster"], since: 0 },
  { char: letter("R"), faces: ["fraunces", "jost", "kaushan-script"], since: 0 },
];
