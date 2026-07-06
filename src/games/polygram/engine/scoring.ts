import type { Puzzle } from "./types";

/** Base points for a word found with no hints: its length. */
export function wordPoints(word: string, lettersRevealed = 0): number {
  let points = word.length;
  for (let i = 0; i < lettersRevealed; i++) {
    points = Math.max(1, Math.floor(points / 2));
  }
  return points;
}

/** Bonus for clearing a level: the level size. */
export function levelBonus(size: number): number {
  return size;
}

/**
 * Best possible score: every required AND bonus word un-hinted plus
 * every level bonus. Clearing required words alone lands well short of
 * 100%, so the top ranks measure how exhaustively each level was swept.
 */
export function maxScore(
  levels: { size: number; words: string[]; bonusWords?: string[] }[],
): number {
  let total = 0;
  for (const level of levels) {
    for (const word of level.words) total += wordPoints(word);
    for (const word of level.bonusWords ?? []) total += wordPoints(word);
    total += levelBonus(level.size);
  }
  return total;
}

export const RANKS = [
  { title: "Beginner", pct: 0 },
  { title: "Good", pct: 25 },
  { title: "Great", pct: 50 },
  { title: "Amazing", pct: 70 },
  { title: "Genius", pct: 90 },
  { title: "Geometer", pct: 100 },
] as const;

export type RankTitle = (typeof RANKS)[number]["title"];

export function rankFor(score: number, puzzle: Puzzle): RankTitle {
  const pct = puzzle.maxScore === 0 ? 0 : (score / puzzle.maxScore) * 100;
  let current: RankTitle = RANKS[0].title;
  for (const rank of RANKS) {
    if (pct >= rank.pct) current = rank.title;
  }
  return current;
}
