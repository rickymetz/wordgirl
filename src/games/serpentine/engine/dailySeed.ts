import { seededRandom } from "../../../lib/random";
import { getPuzzle, getPuzzlePool } from "./puzzles";
import type { Difficulty, PuzzleDef } from "./types";

const SEED_VERSION = 1;

export function dailySeed(difficulty: Difficulty, dateKey: string): string {
  return `serpentine:v${SEED_VERSION}:daily:${difficulty}:${dateKey}`;
}

export function getDailyPuzzle(difficulty: Difficulty, dateKey: string): PuzzleDef {
  const rand = seededRandom(dailySeed(difficulty, dateKey));
  const pool = getPuzzlePool(difficulty);
  const index = Math.floor(rand() * pool.length);
  return getPuzzle(difficulty, index);
}
