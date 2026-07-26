import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { solveBank } from "./generator";
import { buildLexicon, lexiconItems } from "./lexicon";
import { toMultiset } from "./types";
import {
  TUTORIAL_PUZZLE,
  TUTORIAL_STEP_COUNT,
  tutorialStepIndex,
} from "./tutorial";

const dict = parseDictionary(
  readFileSync(
    new URL("../../../lib/words/dictionary.txt", import.meta.url),
    "utf8",
  ),
);
const lexicon = buildLexicon(dict);
const items = lexiconItems(lexicon);
const solutions = solveBank(toMultiset(TUTORIAL_PUZZLE.bank), items);

describe("the tutorial bank", () => {
  it("is small and sorted", () => {
    expect(TUTORIAL_PUZZLE.bank).toEqual([...TUTORIAL_PUZZLE.bank].sort());
    expect(TUTORIAL_PUZZLE.bank).toHaveLength(5);
  });

  it("decomposes exactly ONE way", () => {
    // A tutorial wants a single right answer; the daily generator wants
    // several. If a dictionary change opens a second decomposition, the
    // script's "two letters are left — lay DA" stops being true.
    expect(solutions).toHaveLength(1);
    expect(TUTORIAL_PUZZLE.solutionCount).toBe(solutions.length);
    expect(TUTORIAL_PUZZLE.rowCounts).toEqual([solutions[0].length]);
  });

  it("is one pair row and one palindrome row, in that order", () => {
    const kinds = solutions[0].map((r) => r.kind);
    expect(kinds).toContain("pair");
    expect(kinds).toContain("palindrome");
    expect(solutions[0]).toHaveLength(2);
  });

  it("spends every letter", () => {
    const spent = solutions[0]
      .flatMap((r) => [...r.cost])
      .sort();
    expect(spent).toEqual([...TUTORIAL_PUZZLE.bank].sort());
  });

  it("names rows the lexicon can actually resolve", () => {
    for (const place of TUTORIAL_PUZZLE.seedRows) {
      expect(lexicon.get(place)).toBeDefined();
    }
  });

  it("seedRows are the rows of the one solution", () => {
    const solved = new Set(solutions[0].map((r) => r.place));
    for (const place of TUTORIAL_PUZZLE.seedRows) {
      const def = lexicon.get(place)!;
      expect(solved.has(def.place)).toBe(true);
    }
  });

  it("teaches the pair with a word that reads both ways", () => {
    const pair = solutions[0].find((r) => r.kind === "pair")!;
    expect(pair.words).toHaveLength(2);
    for (const w of pair.words) expect(dict.has(w)).toBe(true);
  });

  it("teaches the palindrome with a real word laid half-way", () => {
    const pal = solutions[0].find((r) => r.kind === "palindrome")!;
    const word = pal.words[0];
    expect(dict.has(word)).toBe(true);
    expect([...word].reverse().join("")).toBe(word);
    // The point of the lesson: you lay fewer letters than the word has.
    expect(pal.place.length).toBeLessThan(word.length);
  });
});

describe("tutorialStepIndex", () => {
  const at = (s: Partial<Parameters<typeof tutorialStepIndex>[0]>) =>
    tutorialStepIndex({ current: "", rows: [], solved: false, ...s });

  it("starts on step one", () => {
    expect(at({})).toBe(0);
  });

  it("advances on staging, then on the first committed row", () => {
    expect(at({ current: "t" })).toBe(1);
    expect(at({ rows: [{}] })).toBe(2);
  });

  it("reports the script finished only when solved", () => {
    expect(at({ solved: true })).toBe(TUTORIAL_STEP_COUNT);
  });
});
