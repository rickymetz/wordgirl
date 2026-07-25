import { describe, it, expect } from "vitest";
import { getThemedPuzzle, getPoolSize, titleSpoilsPhrase } from "./puzzles";
import { validatePuzzle } from "./validation";

describe("titleSpoilsPhrase", () => {
  it("withholds a title that is the phrase", () => {
    const title = "A little Dog that wags his tail";
    expect(titleSpoilsPhrase(title, "A LITTLE DOG THAT WAGS HIS TAIL")).toBe(true);
  });

  it("withholds a title that opens the phrase and covers half of it", () => {
    expect(
      titleSpoilsPhrase("She Walks in Beauty", "SHE WALKS IN BEAUTY, LIKE THE NIGHT"),
    ).toBe(true);
  });

  it("keeps a title that only echoes the first words", () => {
    // Seven letters of thirty-one: a hint, not the answer.
    expect(
      titleSpoilsPhrase("Old Pond", "OLD POND FROGS JUMPING IN SOUND OF WATER"),
    ).toBe(false);
  });

  it("keeps a title that names the poem rather than quoting it", () => {
    expect(
      titleSpoilsPhrase("Sonnet 18", "AND SUMMER'S LEASE HATH ALL TOO SHORT A DATE"),
    ).toBe(false);
  });

  it("ignores punctuation and case when comparing", () => {
    expect(titleSpoilsPhrase("oh! weep for those", "OH! WEEP FOR THOSE")).toBe(true);
  });

  it("says no when either side is empty", () => {
    expect(titleSpoilsPhrase("", "ANY PHRASE")).toBe(false);
    expect(titleSpoilsPhrase("Any Title", "")).toBe(false);
  });
});

describe("serpentine puzzles", () => {
  const size = getPoolSize();
  for (const difficulty of ["haiku", "poem"] as const) {
    for (let i = 0; i < size; i++) {
      const puzzle = getThemedPuzzle(difficulty, i, "validate");
      it(`${puzzle.id} (${difficulty}) has a valid path`, () => {
        const error = validatePuzzle(puzzle);
        expect(error).toBeNull();
      });
    }
  }
});
