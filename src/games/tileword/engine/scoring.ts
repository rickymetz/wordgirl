export interface Rank {
  label: string;
  threshold: number;
}

export const RANKS: Rank[] = [
  { label: "Placed", threshold: 0.25 },
  { label: "Arranged", threshold: 0.5 },
  { label: "Fitted", threshold: 0.75 },
  { label: "Solved", threshold: 1.0 },
];

export function rankFor(
  placedCount: number,
  totalDominoes: number,
): Rank {
  if (totalDominoes === 0) return RANKS[0];
  const pct = placedCount / totalDominoes;
  let best = RANKS[0];
  for (const r of RANKS) {
    if (pct >= r.threshold) best = r;
  }
  return best;
}
