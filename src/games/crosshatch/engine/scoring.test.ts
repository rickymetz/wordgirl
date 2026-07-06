import { describe, expect, it } from "vitest";
import {
  isSolved,
  rankFor,
  remainingInSlot,
  solveTarget,
  uniqueWords,
} from "./scoring";
import type { CrosshatchPuzzle } from "./types";

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

describe("word progress", () => {
  const puzzle = {
    combos: [
      ["bad", "dab"],
      ["bud", "dud"],
      ["dab", "bad"],
    ],
  } as unknown as CrosshatchPuzzle;

  it("uniqueWords dedupes across slots and combos", () => {
    expect(uniqueWords(puzzle.combos)).toEqual(["bad", "bud", "dab", "dud"]);
  });

  it("remainingInSlot counts distinct unfound words per line", () => {
    const none = new Set<string>();
    expect(remainingInSlot(puzzle, none, 0)).toBe(3); // bad, bud, dab
    expect(remainingInSlot(puzzle, none, 1)).toBe(3); // dab, dud, bad
    // Finding a word retires it from EVERY line it can appear in.
    const found = new Set(["bad", "dab"]);
    expect(remainingInSlot(puzzle, found, 0)).toBe(1); // bud
    expect(remainingInSlot(puzzle, found, 1)).toBe(1); // dud
  });
});
