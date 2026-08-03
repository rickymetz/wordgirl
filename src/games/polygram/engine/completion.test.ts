import { describe, expect, it } from "vitest";
import { totalWords } from "./completion";

describe("totalWords", () => {
  it("counts required and bonus words across every level", () => {
    expect(
      totalWords([
        { words: ["aaa", "bbb"], bonusWords: ["ccc"] },
        { words: ["cccc"], bonusWords: [] },
      ]),
    ).toBe(4);
  });

  it("treats a level with no bonus tier as having none", () => {
    expect(totalWords([{ words: ["row", "woo"] }])).toBe(2);
  });
});
