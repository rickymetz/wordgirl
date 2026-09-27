import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import type { Family } from "./families";
import {
  DISPLAY_EXTRA_WORDS,
  PROMOTED_WORDS,
  acceptedLineWords,
  anagramFamilies,
  lineWords,
  otherWords,
  pairings,
} from "./families";
import { SCHEDULE } from "./schedule";
import { TUTORIAL_PUZZLE } from "./tutorial";
import { N } from "./types";

const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
);
const required = new Set(dict.required.buckets.get(N));

describe("anagramFamilies", () => {
  const families = anagramFamilies(dict);

  it("groups common-tier anagrams of six distinct letters", () => {
    expect(families.length).toBeGreaterThan(40);
    for (const f of families) {
      expect(f.words.length).toBeGreaterThanOrEqual(2);
      for (const w of f.words) {
        // Common tier, or hand-promoted from the bonus tier.
        expect(required.has(w) || PROMOTED_WORDS.includes(w), w).toBe(true);
        expect(new Set(w).size).toBe(N);
        expect([...w].sort().join("")).toBe(f.letters);
      }
    }
  });

  it("finds the families the design doc names", () => {
    const words = families.map((f) => f.words.join("/"));
    expect(words).toContain("ideals/ladies/sailed");
    expect(words).toContain("listen/silent");
  });
});

describe("lineWords", () => {
  it("includes bonus-tier anagrams, so uniqueness covers them", () => {
    const words = lineWords(dict, "adeils");
    expect(words).toContain("ladies");
    expect(words).toContain("deasil");
  });
});

describe("pairings", () => {
  const fam = (...words: string[]): Family => ({
    letters: [...words[0]].sort().join(""),
    words,
  });

  it("puts the diagonal only where the words agree in exactly one place", () => {
    // LADIES/IDEALS share only the final S.
    const p = pairings(fam("ideals", "ladies"), "diagonal");
    expect(p.map((x) => [x.hiddenWord, x.cluedWord, x.row])).toEqual([
      ["ideals", "ladies", 5],
      ["ladies", "ideals", 5],
    ]);
    // SACRED/SCARED agree in four places: a column would repeat a letter.
    expect(pairings(fam("sacred", "scared"), "diagonal")).toEqual([]);
  });

  it("crosses an across and a down wherever their letters meet", () => {
    const p = pairings(fam("sacred", "scared"), "cross");
    // Six letters each way, distinct: one crossing per (row, col) letter match.
    expect(p.length).toBe(2 * N);
    for (const x of p) {
      expect(x.cluedWord[x.col]).toBe(x.hiddenWord[x.row]);
      expect(x.cluedCells).toEqual(Array.from({ length: N }, (_, c) => x.row * N + c));
      expect(x.hiddenCells).toEqual(Array.from({ length: N }, (_, r) => r * N + x.col));
    }
  });
});

describe("the results card's other words", () => {
  const families = new Map(anagramFamilies(dict).map((f) => [f.letters, f]));
  const sorted = (w: string) => [...w].sort().join("");

  it("extras are bonus-tier anagrams of a scheduled family, not already in it", () => {
    const scheduled = new Set(SCHEDULE.map((f) => f.letters));
    for (const w of DISPLAY_EXTRA_WORDS) {
      expect(required.has(w)).toBe(false);
      expect(dict.has(w)).toBe(true);
      expect(scheduled.has(sorted(w))).toBe(true);
      expect(families.get(sorted(w))?.words).not.toContain(w);
      expect(lineWords(dict, sorted(w))).toContain(w);
    }
  });

  it("lists the family plus its everyday extras, minus the day's two words", () => {
    const f = families.get("acders")!;
    const list = otherWords({ letters: f.letters, family: f.words, cluedWord: "sacred", hiddenWord: "scared" });
    expect(list).toContain("cedars");
    expect(list).toContain("cadres");
    expect(list).not.toContain("sacred");
    expect(list).not.toContain("scared");
    // The tutorial's family is only LISTEN/SILENT; its extras still show.
    expect(otherWords(TUTORIAL_PUZZLE)).toEqual(["enlist", "inlets", "tinsel"]);
  });

  it("the words a line may spell include repeat-letter words, all from the letters", () => {
    const ws = acceptedLineWords(dict, "aegprs");
    expect(ws).toContain("papers");
    expect(ws).toContain("grapes");
    for (const w of ws) expect([...w].every((ch) => "aegprs".includes(ch))).toBe(true);
  });
});
