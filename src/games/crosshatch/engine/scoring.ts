import type { CrosshatchPuzzle } from "./types";
import { comboKey } from "./types";

export const RANKS = [
  { pct: 0, title: "Beginner" },
  { pct: 25, title: "Good" },
  { pct: 50, title: "Great" },
  { pct: 70, title: "Amazing" },
  { pct: 90, title: "Genius" },
  { pct: 100, title: "Crosshatch" },
] as const;

export type RankTitle = (typeof RANKS)[number]["title"];

/**
 * A day counts as SOLVED at this percentage — the top-rank threshold.
 * 100% ("Crosshatch") is the flex above it, so one elusive combo never
 * breaks a streak.
 */
export const SOLVE_PCT = 90;

export function rankFor(found: number, total: number): RankTitle {
  const pct = total === 0 ? 0 : (found / total) * 100;
  let title: RankTitle = RANKS[0].title;
  for (const rank of RANKS) {
    if (pct >= rank.pct) title = rank.title;
  }
  return title;
}

/** Combos needed to mark the day solved. */
export function solveTarget(total: number): number {
  return Math.ceil((total * SOLVE_PCT) / 100);
}

export function isSolved(found: number, total: number): boolean {
  return total > 0 && found >= solveTarget(total);
}

/**
 * The always-visible deduction aid: how many UNFOUND combos use `word`
 * in slot `slotIndex`. Zero means that word is exhausted there.
 */
export function remainingWithWord(
  puzzle: CrosshatchPuzzle,
  foundKeys: ReadonlySet<string>,
  slotIndex: number,
  word: string,
): number {
  let n = 0;
  for (const combo of puzzle.combos) {
    if (combo[slotIndex] === word && !foundKeys.has(comboKey(combo))) n++;
  }
  return n;
}
