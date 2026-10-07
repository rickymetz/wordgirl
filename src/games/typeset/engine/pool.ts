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
const letter = (char: string): CharacterSpec => ch(char, char, `${char}’s`);

export const CHARSET_POOL: readonly CharsetEntry[] = [
  { theme: "Letters", face: "jost", chars: [letter("a"), letter("g"), letter("R")], since: 0 },
  { theme: "Symbols", face: "fraunces", chars: [ch("&", "ampersand"), ch("@", "at sign"), ch("#", "number sign")], since: 0 },
  { theme: "Currency", face: "fraunces", chars: [ch("$", "dollar sign"), ch("€", "euro sign"), ch("¥", "yen sign")], since: 0 },
  { theme: "Beyond A–Z", face: "eb-garamond", chars: [ch("ß", "sharp s", "sharp s’s"), ch("Æ", "ash", "ashes"), ch("Ø", "slashed O", "slashed O’s")], since: 0 },
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
];

export const FACES_POOL: readonly FacesEntry[] = [
  { char: letter("g"), faces: ["eb-garamond", "jost", "lobster"], since: 0 },
  { char: letter("a"), faces: ["bodoni-moda", "jost", "kaushan-script"], since: 0 },
  { char: letter("R"), faces: ["bodoni-moda", "archivo-black", "roboto-slab"], since: 0 },
  { char: letter("Q"), faces: ["eb-garamond", "jost", "roboto-slab"], since: 0 },
  // "f", not "y": a lone black mono "y" reads as a grotesque (see MONO_TELLING).
  { char: letter("f"), faces: ["fraunces", "jetbrains-mono", "lobster"], since: 0 },
  { char: ch("&", "ampersand"), faces: ["eb-garamond", "archivo-black", "kaushan-script"], since: 0 },
  { char: letter("e"), faces: ["literata", "jost", "lobster"], since: 0 },
  { char: letter("k"), faces: ["jost", "roboto-slab", "kaushan-script"], since: 0 },
];
