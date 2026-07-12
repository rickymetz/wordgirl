import { seededRandom } from "../../../lib/random";
import { getThemedPuzzle, getPoolSize } from "./puzzles";
import type { Difficulty, PuzzleDef } from "./types";

export function practiceSeed(random: string, difficulty: Difficulty): string {
  return `serpentine:practice:${difficulty}:${random}`;
}

export function getPracticePuzzle(
  seed: string,
  difficulty: Difficulty,
): PuzzleDef {
  const rand = seededRandom(seed);
  const index = Math.floor(rand() * getPoolSize("haiku"));
  return getThemedPuzzle(difficulty, index, seed);
}
