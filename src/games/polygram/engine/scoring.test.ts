import { describe, expect, it } from "vitest";
import { levelBonus, maxScore, rankFor, wordPoints } from "./scoring";
import type { Puzzle } from "./types";

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
  it("sums un-hinted word points plus level bonuses", () => {
    const levels = [
      { size: 3, words: ["aaa", "bbb"] }, // 3+3 + bonus 3 = 9
      { size: 4, words: ["cccc"] }, // 4 + bonus 4 = 8
    ];
    expect(maxScore(levels)).toBe(17);
    expect(levelBonus(4)).toBe(4);
  });
});

describe("rankFor", () => {
  const puzzle = { maxScore: 100 } as Puzzle;
  it("maps score percentage to rank titles", () => {
    expect(rankFor(0, puzzle)).toBe("Beginner");
    expect(rankFor(24, puzzle)).toBe("Beginner");
    expect(rankFor(25, puzzle)).toBe("Good");
    expect(rankFor(50, puzzle)).toBe("Great");
    expect(rankFor(70, puzzle)).toBe("Amazing");
    expect(rankFor(90, puzzle)).toBe("Genius");
    expect(rankFor(100, puzzle)).toBe("Polygon");
  });
});
