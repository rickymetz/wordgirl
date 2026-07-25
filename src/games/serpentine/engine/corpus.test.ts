import { describe, expect, it } from "vitest";
import rawDictionary from "../../../lib/words/dictionary.txt?raw";
import {
  allPoemEntries,
  getPoolSize,
  getThemedPuzzle,
  titleSpoilsPhrase,
} from "./puzzles";

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
  "GROWST", "HASNT", "HOPD", "HORYU", "HORYUJI", "HOSTILER", "I", "IM", "JI",
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

  /** The marks the readout knows how to draw. */
  const MARKS = "'\\-—,.;:!?";

  it("uses only uppercase letters, drawable marks, and single spaces", () => {
    const shape = new RegExp(`^[A-Z${MARKS}]+(?: [A-Z${MARKS}]+)*$`);
    const malformed = entries
      .map(([, , text]) => text)
      .filter((text) => !shape.test(text));
    expect(malformed).toEqual([]);
  });

  it("never doubles a mark or leaves one stranded", () => {
    const malformed = entries
      .map(([, , text]) => text)
      .filter((text) => /''|'-|-'|,,|--|\s[,.;:!?]|^[,.;:!?]/.test(text));
    expect(malformed).toEqual([]);
  });

  it("spells real words — no dash-welded runs", () => {
    const unknown = new Set<string>();
    for (const [, , text] of entries) {
      // Marks are typography, not spelling: LIFE'S is judged as LIFES,
      // which the allowlist carries as an elision. Only a space, hyphen,
      // or em dash ends a word — TO—UNITE is two words, not TOUNITE.
      for (const word of text.replace(/[^A-Z —-]/g, "").split(/[ —-]/)) {
        if (word && !DICTIONARY.has(word) && !POETIC_WORDS.has(word)) {
          unknown.add(word);
        }
      }
    }
    expect([...unknown]).toEqual([]);
  });

  it("marks no haiku as an excerpt", () => {
    // A haiku is a whole poem. Only the English pool holds lines lifted
    // out of something longer, so a restore run that mixed the two up
    // would show here before it reached a player.
    const flagged = allPoemEntries("haiku")
      .filter(([, , , excerpt]) => excerpt)
      .map(([, , text]) => text);
    expect(flagged).toEqual([]);
  });

  it("marks the English lines as excerpts of their poems", () => {
    const english = allPoemEntries("english");
    const excerpts = english.filter(([, , , excerpt]) => excerpt);
    expect(excerpts.length).toBeGreaterThan(english.length * 0.9);
  });

  it("never shows a title that gives its phrase away", () => {
    // Dickinson is catalogued by first line, so an unguarded title
    // prints the answer above its own grid.
    const shown = entries.filter(([, title, text]) => !titleSpoilsPhrase(title, text));
    const leaked = shown.filter(([, title, text]) => {
      const t = title.toUpperCase().replace(/[^A-Z]/g, "");
      const p = text.replace(/[^A-Z]/g, "");
      return t.includes(p) || (p.startsWith(t) && t.length * 2 >= p.length);
    });
    expect(leaked).toEqual([]);
    // …and the guard is not simply hiding every title.
    expect(shown.length).toBeGreaterThan(entries.length * 0.7);
  });

  it("withholds the title on the poems cited by their first line", () => {
    const withheld = entries.filter(([, title, text]) => titleSpoilsPhrase(title, text));
    expect(withheld.length).toBeGreaterThan(50);
  });

  it("carries the excerpt flag through to the puzzle", () => {
    const size = getPoolSize();
    const seen = new Set<boolean>();
    for (let i = 0; i < size; i++) {
      seen.add(getThemedPuzzle("haiku", i, "excerpt-test").excerpt);
      seen.add(getThemedPuzzle("poem", i, "excerpt-test").excerpt);
    }
    // Both states reachable: the flag is plumbed, not hardcoded.
    expect([...seen].sort()).toEqual([false, true]);
  });

  it("lists no allowlisted word the dictionary already knows", () => {
    const redundant = [...POETIC_WORDS].filter((w) => DICTIONARY.has(w));
    expect(redundant).toEqual([]);
  });
});
