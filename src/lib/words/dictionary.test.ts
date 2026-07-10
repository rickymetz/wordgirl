import { describe, expect, it } from "vitest";
import { enumerateWords, letterMask, parseDictionary } from "./dictionary";

const FIXTURE = [
  // 3-letter required
  "bab", "bad", "cab", "dab", "dad", "tan", "zoo",
  // 4-letter required
  "abba", "dada", "toon",
  // bonus tier ("+"-prefixed)
  "+abb", "+baba",
].join("\n");

describe("letterMask", () => {
  it("sets one bit per distinct letter", () => {
    expect(letterMask("a")).toBe(1);
    expect(letterMask("ab")).toBe(0b11);
    expect(letterMask("aab")).toBe(0b11); // reuse doesn't add bits
    expect(letterMask("z")).toBe(1 << 25);
  });
});

describe("parseDictionary", () => {
  it("buckets words by length and tier", () => {
    const dict = parseDictionary(FIXTURE);
    expect(dict.required.buckets.get(3)).toHaveLength(7);
    expect(dict.required.buckets.get(4)).toHaveLength(3);
    expect(dict.bonus.buckets.get(3)).toEqual(["abb"]);
    expect(dict.bonus.buckets.get(4)).toEqual(["baba"]);
    expect(dict.has("cab")).toBe(true);
    expect(dict.has("abb")).toBe(true);
    expect(dict.has("nope")).toBe(false);
  });

  it("ignores blank lines and out-of-range lengths", () => {
    const dict = parseDictionary("a\n\ncat\n\nsupercalifragilistic\n");
    expect(dict.has("a")).toBe(false);
    expect(dict.has("cat")).toBe(true);
    expect(dict.has("supercalifragilistic")).toBe(false);
  });
});

describe("enumerateWords — reuse-allowed semantics", () => {
  const dict = parseDictionary(FIXTURE);

  it("letters a,b,d at level 3: reuse allowed, subset letters fine", () => {
    // "bab" reuses b; "dad" reuses d; "cab"/"tan"/"zoo" need letters
    // outside the set; a word need not use every set letter.
    expect(enumerateWords(dict, ["a", "b", "d"], 3).sort()).toEqual([
      "bab",
      "bad",
      "dab",
      "dad",
    ]);
    // Bonus tier enumerates separately.
    expect(enumerateWords(dict, ["a", "b", "d"], 3, "bonus")).toEqual(["abb"]);
    expect(enumerateWords(dict, ["a", "b", "d"], 4, "bonus")).toEqual(["baba"]);
  });

  it("level 4 with the same letters", () => {
    expect(enumerateWords(dict, ["a", "b", "d"], 4).sort()).toEqual([
      "abba",
      "dada",
    ]);
  });

  it("only matches words of exactly the level size", () => {
    // "tan" needs an 'a' that isn't in the set; "toon" is 4 letters.
    expect(enumerateWords(dict, ["t", "o", "n"], 3)).toEqual([]);
    expect(enumerateWords(dict, ["t", "o", "n"], 4)).toEqual(["toon"]);
  });
});
