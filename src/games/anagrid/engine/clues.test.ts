import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { CLUES } from "./clues";
import { anagramFamilies } from "./families";

const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
);
const families = anagramFamilies(dict);

describe("clues", () => {
  it("covers every word a puzzle can clue", () => {
    const missing = families.flatMap((f) => f.words).filter((w) => !CLUES[w]);
    expect(missing).toEqual([]);
  });

  it("never names the answer or a family member", () => {
    for (const f of families) {
      for (const w of f.words) {
        const clue = CLUES[w].toLowerCase();
        for (const member of f.words) expect(clue, w).not.toContain(member);
      }
    }
  });

  it("stays short enough for the clue card", () => {
    for (const [w, clue] of Object.entries(CLUES)) {
      expect(clue.length, w).toBeLessThanOrEqual(40);
    }
  });
});
