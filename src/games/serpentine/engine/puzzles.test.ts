import { describe, it, expect } from "vitest";
import { getPuzzlePool } from "./puzzles";
import { validatePuzzle } from "./validation";

describe("serpentine puzzles", () => {
  for (const difficulty of ["easy", "medium", "hard"] as const) {
    const pool = getPuzzlePool(difficulty);
    for (const puzzle of pool) {
      it(`${puzzle.id} (${difficulty}) has valid paths`, () => {
        const error = validatePuzzle(puzzle);
        expect(error).toBeNull();
      });
    }
  }
});
