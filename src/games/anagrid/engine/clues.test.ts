import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { CLUES, clueFor } from "./clues";
import { anagramFamilies } from "./families";

const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
);
const families = anagramFamilies(dict);

describe("clues", () => {
  it("covers every word a puzzle can clue", () => {
    const missing = families.flatMap((f) => f.words).filter((w) => !CLUES[w]?.length);
    expect(missing).toEqual([]);
  });

  it("never names the answer or a family member", () => {
    for (const f of families) {
      for (const w of f.words) {
        for (const clue of CLUES[w]) {
          for (const member of f.words) {
            expect(clue.toLowerCase(), `${w}: ${clue}`).not.toContain(member);
          }
        }
      }
    }
  });

  it("stays short enough for the clue card", () => {
    for (const [w, list] of Object.entries(CLUES)) {
      for (const clue of list) expect(clue.length, `${w}: ${clue}`).toBeLessThanOrEqual(40);
    }
  });

  it("offers two or three per word, all different", () => {
    for (const [w, list] of Object.entries(CLUES)) {
      expect(list.length, w).toBeGreaterThanOrEqual(2);
      expect(list.length, w).toBeLessThanOrEqual(3);
      expect(new Set(list).size, w).toBe(list.length);
    }
  });

  it("rotates by cycle", () => {
    expect(clueFor("listen", 0)).toBe(CLUES.listen[0]);
    expect(clueFor("listen", 1)).toBe(CLUES.listen[1]);
    expect(clueFor("listen", CLUES.listen.length)).toBe(CLUES.listen[0]);
  });

  it("uses American spelling", () => {
    const british = /\b(lorr(y|ies)|colour|favour|travell|centre|theatre|organis|realis|tyre)/i;
    for (const [w, list] of Object.entries(CLUES)) {
      for (const clue of list) expect(clue, w).not.toMatch(british);
    }
  });
});
