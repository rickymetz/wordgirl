import { describe, expect, it } from "vitest";
import { levelBonus, maxScore, wordPoints } from "./scoring";

describe("wordPoints", () => {
  it("scores a word by its length", () => {
    expect(wordPoints("cat")).toBe(3);
    expect(wordPoints("square")).toBe(6);
  });

  it("halves per revealed letter with a floor of 1", () => {
    expect(wordPoints("square", 1)).toBe(3);
    expect(wordPoints("square", 2)).toBe(1);
    expect(wordPoints("square", 3)).toBe(1);
    expect(wordPoints("cat", 5)).toBe(1);
  });
});

describe("maxScore", () => {
  it("sums required + bonus word points plus level bonuses", () => {
    const levels = [
      { size: 3, words: ["aaa", "bbb"], bonusWords: ["ccc"] }, // 3+3+3 + 3
      { size: 4, words: ["cccc"], bonusWords: [] }, // 4 + 4
    ];
    expect(maxScore(levels)).toBe(20);
    expect(levelBonus(4)).toBe(4);
  });
});

