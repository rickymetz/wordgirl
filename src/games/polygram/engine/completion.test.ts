import { describe, expect, it } from "vitest";
import { bonusFound, requiredWords } from "./completion";

const LEVELS = [
  { size: 3, words: ["bad", "dab"], bonusWords: ["abb"] },
  { size: 4, words: ["abba"], bonusWords: ["baba", "bade"] },
];

describe("requiredWords", () => {
  it("counts what the puzzle asks for, across every level", () => {
    expect(requiredWords(LEVELS)).toBe(3);
  });

  it("ignores the bonus tier entirely", () => {
    // The reason this function exists: the bonus tier averages 142 words
    // against 17 required and swings from 3 to 615, so folding it in made
    // a fully solved board report a single-digit percentage.
    const huge = [{ words: ["bad"], bonusWords: Array(600).fill("x") }];
    expect(requiredWords(huge)).toBe(1);
  });
});

describe("bonusFound", () => {
  it("counts only the found words that came from the bonus tier", () => {
    expect(bonusFound(LEVELS, ["bad", "abb", "abba", "baba"])).toBe(2);
  });

  it("is zero when a player found nothing rare", () => {
    expect(bonusFound(LEVELS, ["bad", "dab", "abba"])).toBe(0);
  });

  it("treats a level with no bonus tier as having none", () => {
    expect(bonusFound([{ words: ["row"] }], ["row"])).toBe(0);
  });
});
