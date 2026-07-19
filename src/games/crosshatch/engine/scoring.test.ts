import { describe, expect, it } from "vitest";
import {
  isSolved,
  uniqueWords,
} from "./scoring";

describe("solve threshold", () => {
  it("solves only when all words are found", () => {
    expect(isSolved(19, 20)).toBe(false);
    expect(isSolved(20, 20)).toBe(true);
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
