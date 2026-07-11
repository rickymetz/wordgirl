import { describe, it, expect } from "vitest";
import { getPuzzlePool } from "./puzzles";
import { validatePuzzle } from "./validation";

describe("serpentine puzzles", () => {
  for (const difficulty of ["haiku", "poem"] as const) {
    const pool = getPuzzlePool(difficulty);
    for (const puzzle of pool) {
      it(`${puzzle.id} (${difficulty}) has a valid path`, () => {
        const error = validatePuzzle(puzzle);
        expect(error).toBeNull();
      });
    }
  }
});
