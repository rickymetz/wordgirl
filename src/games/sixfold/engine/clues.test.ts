import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { CLUES, clueFor } from "./clues";
import { CRYPTIC } from "./cryptic";
import { anagramFamilies } from "./families";

const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
);
const families = anagramFamilies(dict);
const allWords = families.flatMap((f) => f.words);
const british = /\b(lorr(y|ies)|colour|favour|travell|centre|theatre|organis|realis|tyre|sombre)/i;

describe("straight clues", () => {
  it("cover every answer word, two each, all different", () => {
    for (const w of allWords) {
      expect(CLUES[w]?.length, w).toBe(2);
      expect(new Set(CLUES[w]).size, w).toBe(2);
    }
  });

  it("stay within 40 characters", () => {
    for (const [w, list] of Object.entries(CLUES)) {
      for (const clue of list) expect(clue.length, `${w}: ${clue}`).toBeLessThanOrEqual(40);
    }
  });
});

describe("cryptic clues", () => {
  it("cover every answer word, each with its explanation", () => {
    for (const w of allWords) {
      expect(CRYPTIC[w]?.clue, w).toBeTruthy();
      expect(CRYPTIC[w]?.how, w).toBeTruthy();
    }
  });

  it("stay within 48 characters", () => {
    for (const [w, c] of Object.entries(CRYPTIC)) {
      expect(c.clue.length, `${w}: ${c.clue}`).toBeLessThanOrEqual(48);
    }
  });

  it("never lean on anagram wordplay — the letter pad already gives the letters", () => {
    const indicators = /\b(anagram|shuffl|scrambl|mixed|jumbl|rearrang|messy|confused|wild(ly)?|broken)\b/i;
    for (const [w, c] of Object.entries(CRYPTIC)) expect(c.clue, w).not.toMatch(indicators);
  });

  it("hide-word clues really hide the answer", () => {
    for (const [w, c] of Object.entries(CRYPTIC)) {
      if (!c.how.startsWith("Hidden")) continue;
      expect(c.clue.toLowerCase().replace(/[^a-z]/g, ""), w).toContain(w);
    }
  });
});

describe("every clue", () => {
  const texts = (w: string) => [...(CLUES[w] ?? []), CRYPTIC[w]?.clue ?? ""];

  it("never names its answer or a family member", () => {
    for (const f of families) {
      for (const w of f.words) {
        for (const clue of texts(w)) {
          for (const member of f.words) {
            expect(clue.toLowerCase(), `${w}: ${clue}`).not.toContain(member);
          }
        }
      }
    }
  });

  it("uses American spelling", () => {
    for (const w of allWords) for (const clue of texts(w)) expect(clue, w).not.toMatch(british);
  });
});

describe("clueFor", () => {
  it("rotates straight, straight, cryptic, and round again", () => {
    expect(clueFor("listen", 0)).toEqual({ text: CLUES.listen[0], cryptic: false });
    expect(clueFor("listen", 1)).toEqual({ text: CLUES.listen[1], cryptic: false });
    expect(clueFor("listen", 2)).toEqual({
      text: CRYPTIC.listen.clue,
      cryptic: true,
      how: CRYPTIC.listen.how,
    });
    expect(clueFor("listen", 3)).toEqual(clueFor("listen", 0));
  });
});
