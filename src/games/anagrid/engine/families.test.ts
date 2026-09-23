import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import type { Family } from "./families";
import { anagramFamilies, lineWords, pairings } from "./families";
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
        expect(required.has(w), w).toBe(true);
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
