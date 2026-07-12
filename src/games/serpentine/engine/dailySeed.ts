import { seededRandom } from "../../../lib/random";
import { getThemedPuzzle, getPoolSize } from "./puzzles";
import type { Difficulty, PuzzleDef } from "./types";

const SEED_VERSION = 2;

export function dailySeed(difficulty: Difficulty, dateKey: string): string {
  return `serpentine:v${SEED_VERSION}:daily:${difficulty}:${dateKey}`;
}

export function getDailyPuzzle(difficulty: Difficulty, dateKey: string): PuzzleDef {
  const rand = seededRandom(dailySeed(difficulty, dateKey));
  const index = Math.floor(rand() * getPoolSize());
  return getThemedPuzzle(difficulty, index, dateKey);
}
