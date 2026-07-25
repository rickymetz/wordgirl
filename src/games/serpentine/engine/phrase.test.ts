import { describe, expect, it } from "vitest";
import { phraseWords } from "./phrase";

describe("phraseWords", () => {
  it("splits on spaces and numbers letters continuously", () => {
    expect(phraseWords("OLD POND FROG")).toEqual([
      { start: 0, segments: [[0, 3]] },
      { start: 3, segments: [[3, 7]] },
      { start: 7, segments: [[7, 11]] },
    ]);
  });

  it("keeps a hyphenated compound as one word in two segments", () => {
    expect(phraseWords("AN APPLE-TREE")).toEqual([
      { start: 0, segments: [[0, 2]] },
      { start: 2, segments: [[2, 7], [7, 11]] },
    ]);
  });

  it("handles a compound with several hyphens", () => {
    expect(phraseWords("THREE-AND-THIRTY")).toEqual([
      { start: 0, segments: [[0, 5], [5, 8], [8, 14]] },
    ]);
  });

  it("does not let separators consume letter indices", () => {
    const text = "SO WELL GO NO MORE A-ROVING";
    const last = phraseWords(text).at(-1)!;
    expect(last.segments.at(-1)![1]).toBe(text.replace(/[^A-Z]/g, "").length);
  });

  it("collapses repeated and dangling separators", () => {
    expect(phraseWords("  OH  -MY WORD- ")).toEqual([
      { start: 0, segments: [[0, 2]] },
      { start: 2, segments: [[2, 4]] },
      { start: 4, segments: [[4, 8]] },
    ]);
  });

  it("returns nothing for an empty phrase", () => {
    expect(phraseWords("")).toEqual([]);
  });
});
