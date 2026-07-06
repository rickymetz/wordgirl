import type { Combo, CrosshatchPuzzle } from "./types";

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
 * 100% ("Crosshatch") is the flex above it, so one elusive word never
 * breaks a streak.
 */
export const SOLVE_PCT = 90;

/**
 * The unit of progress is the distinct WORD, not the full-grid combo:
 * submitting a valid grid banks every new word in it, so the player
 * never re-submits near-identical grids just to sweep a cross-product.
 */
export function uniqueWords(combos: readonly Combo[]): string[] {
  return [...new Set(combos.flat())].sort();
}

export function rankFor(found: number, total: number): RankTitle {
  const pct = total === 0 ? 0 : (found / total) * 100;
  let title: RankTitle = RANKS[0].title;
  for (const rank of RANKS) {
    if (pct >= rank.pct) title = rank.title;
  }
  return title;
}

/** Words needed to mark the day solved. */
export function solveTarget(total: number): number {
  return Math.ceil((total * SOLVE_PCT) / 100);
}

export function isSolved(found: number, total: number): boolean {
  return total > 0 && found >= solveTarget(total);
}

/**
 * The always-visible deduction aid: how many words this line can still
 * yield. Zero means the line is exhausted — leave any valid word there
 * and hunt elsewhere.
 */
export function remainingInSlot(
  puzzle: CrosshatchPuzzle,
  found: ReadonlySet<string>,
  slotIndex: number,
): number {
  const words = new Set<string>();
  for (const combo of puzzle.combos) {
    if (!found.has(combo[slotIndex])) words.add(combo[slotIndex]);
  }
  return words.size;
}
