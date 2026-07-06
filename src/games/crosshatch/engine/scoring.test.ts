import { describe, expect, it } from "vitest";
import {
  isSolved,
  rankFor,
  remainingWithWord,
  solveTarget,
} from "./scoring";
import type { CrosshatchPuzzle } from "./types";
import { comboKey } from "./types";

describe("rankFor", () => {
  it("maps found percentage to rank titles", () => {
    expect(rankFor(0, 20)).toBe("Beginner");
    expect(rankFor(4, 20)).toBe("Beginner"); // 20%
    expect(rankFor(5, 20)).toBe("Good"); // 25%
    expect(rankFor(10, 20)).toBe("Great");
    expect(rankFor(14, 20)).toBe("Amazing");
    expect(rankFor(18, 20)).toBe("Genius"); // 90%
    expect(rankFor(20, 20)).toBe("Crosshatch");
    expect(rankFor(0, 0)).toBe("Beginner");
  });
});

describe("solve threshold", () => {
  it("solves at 90%, rounded up", () => {
    expect(solveTarget(20)).toBe(18);
    expect(solveTarget(21)).toBe(19); // ceil(18.9)
    expect(isSolved(17, 20)).toBe(false);
    expect(isSolved(18, 20)).toBe(true);
    expect(isSolved(0, 0)).toBe(false);
  });
});

describe("remainingWithWord", () => {
  const puzzle = {
    combos: [
      ["bad", "dab"],
      ["bud", "dud"],
      ["dab", "bad"],
    ],
  } as unknown as CrosshatchPuzzle;

  it("counts unfound combos using a word in a slot", () => {
    const none = new Set<string>();
    expect(remainingWithWord(puzzle, none, 0, "bad")).toBe(1);
    expect(remainingWithWord(puzzle, none, 1, "bad")).toBe(1);
    expect(remainingWithWord(puzzle, none, 0, "zzz")).toBe(0);

    const found = new Set([comboKey(["bad", "dab"])]);
    expect(remainingWithWord(puzzle, found, 0, "bad")).toBe(0);
    expect(remainingWithWord(puzzle, found, 0, "dab")).toBe(1);
  });
});
