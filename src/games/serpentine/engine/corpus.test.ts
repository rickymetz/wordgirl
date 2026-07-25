import { describe, expect, it } from "vitest";
import rawDictionary from "../../../lib/words/dictionary.txt?raw";
import { allPoemEntries } from "./puzzles";

/**
 * The phrases were transcribed from poetry datasets by stripping
 * punctuation, and a stripped dash used to weld its neighbours into one
 * run of letters (TOUNITE, APPLETREE). The readout above the board
 * draws word breaks, so a weld shows up as a nonsense word the player
 * has to decipher. Every word in the corpus therefore has to be a real
 * word — or a listed proper noun or elision.
 */
const DICTIONARY = new Set(
  rawDictionary
    .split("\n")
    .map((line) => line.replace(/^\+/, "").trim().toUpperCase())
    .filter(Boolean),
);

/**
 * Words the dictionary does not carry but the poems legitimately use:
 * proper nouns, apostrophe elisions (WATERD, OER), archaic inflections
 * (GROWST), and words past the dictionary's ten-letter cap.
 */
const POETIC_WORDS = new Set([
  "A", "AEGLE", "ALBION", "ANNE", "APPRENTICED", "ARGO", "ASAKUSA",
  "BEAUTYS", "BEREAVEMENT", "BOWLES", "BRIMMD", "BUDDHAS",
  "BUTTERFLYS", "CARO", "CHILLD", "CHRISTABEL", "CLOYD", "COBBETT",
  "CONSPICUOUS", "DAMN", "DECEMBER", "DOESNT", "DONT", "DOOMD",
  "EDENS", "EER", "ENJOYD", "EXPELLD", "FADETH", "FANND",
  "FRIENDSHIPS", "FRINGD", "FRUITFULNESS", "FUJIYAMA", "GLENARVON",
  "GROWST", "HASNT", "HOPD", "HORYUJI", "HOSTILER", "I", "IM",
  "IMPEDIMENTS", "INTERCEPTING", "ISES", "ISSA", "ITALIAN", "JOVE",
  "KNOWST", "LEANDER", "LIFES", "LINGERD", "MATSUSHIMA",
  "MISFORTUNES", "MOGAMI", "MOORE", "MURRAY", "NAZUNA", "NEER",
  "NOTTINGHAM", "NUMIDIAN", "O", "OER", "OWST", "PAINE",
  "PENETRATING", "PILLOWD", "POISD", "RAPE", "REMEMBERD",
  "REQUIREMENT", "RUIND", "RUSHD", "SADO", "SADOS", "SEEST",
  "SOVEREIGNTY", "STRINGLESSLY", "T", "TAMAGAWA", "TIS",
  "TRANSMOGRIFIED", "TREMULOUSLY", "TYGER", "UYENO", "VICTORYS",
  "WANDERST", "WATERD", "WAVRING", "YOUD", "YOULL",
]);

const entries = allPoemEntries();

describe("serpentine poem corpus", () => {
  it("has entries", () => {
    expect(entries.length).toBeGreaterThan(400);
  });

  it("uses only uppercase letters and single word separators", () => {
    const malformed = entries
      .map(([, , text]) => text)
      .filter((text) => !/^[A-Z]+(?:[ -][A-Z]+)*$/.test(text));
    expect(malformed).toEqual([]);
  });

  it("spells real words — no dash-welded runs", () => {
    const unknown = new Set<string>();
    for (const [, , text] of entries) {
      for (const word of text.split(/[ -]/)) {
        if (!DICTIONARY.has(word) && !POETIC_WORDS.has(word)) {
          unknown.add(word);
        }
      }
    }
    expect([...unknown]).toEqual([]);
  });

  it("lists no allowlisted word the dictionary already knows", () => {
    const redundant = [...POETIC_WORDS].filter((w) => DICTIONARY.has(w));
    expect(redundant).toEqual([]);
  });
});
