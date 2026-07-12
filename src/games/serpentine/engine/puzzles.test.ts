import { describe, it, expect } from "vitest";
import { getThemedPuzzle, getPoolSize } from "./puzzles";
import { validatePuzzle } from "./validation";

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
