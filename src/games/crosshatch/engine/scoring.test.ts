import { describe, expect, it } from "vitest";
import {
  isSolved,
  rankFor,
  solveTarget,
  uniqueWords,
} from "./scoring";

describe("rankFor", () => {
  it("maps found percentage to rank titles", () => {
    expect(rankFor(0, 20)).toBe("Beginner");
    expect(rankFor(4, 20)).toBe("Beginner"); // 20%
    expect(rankFor(5, 20)).toBe("Good"); // 25%
    expect(rankFor(10, 20)).toBe("Great");
    expect(rankFor(14, 20)).toBe("Amazing");
    expect(rankFor(18, 20)).toBe("Genius"); // 90%
    expect(rankFor(20, 20)).toBe("Weaver");
    expect(rankFor(0, 0)).toBe("Beginner");
  });
});

describe("solve threshold", () => {
  it("solves at 90% with at least two words of slack", () => {
    expect(solveTarget(20)).toBe(18); // ceil(18) == n-2
    expect(solveTarget(21)).toBe(19); // ceil(18.9) == n-2
    // Plain ceil would demand "all but one" on 10-19-word days.
    expect(solveTarget(16)).toBe(14);
    expect(solveTarget(10)).toBe(8);
    expect(isSolved(17, 20)).toBe(false);
    expect(isSolved(18, 20)).toBe(true);
    expect(isSolved(0, 0)).toBe(false);
  });
});

describe("uniqueWords", () => {
  it("dedupes across slots and combos", () => {
    expect(
      uniqueWords([
        ["bad", "dab"],
        ["bud", "dud"],
        ["dab", "bad"],
      ]),
    ).toEqual(["bad", "bud", "dab", "dud"]);
  });
});
