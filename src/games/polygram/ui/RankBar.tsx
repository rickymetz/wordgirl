import type { Puzzle } from "../engine/types";
import { RANKS, rankFor } from "../engine/scoring";

interface Props {
  score: number;
  puzzle: Puzzle;
}

export function RankBar({ score, puzzle }: Props) {
  const rank = rankFor(score, puzzle);
  const pct = puzzle.maxScore === 0 ? 0 : (score / puzzle.maxScore) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm font-semibold">{rank}</span>
      <div className="relative flex h-4 flex-1 items-center">
        <div className="absolute inset-x-0 h-0.5 bg-line" />
        {RANKS.map((r) => (
          <span
            key={r.title}
            className={`absolute h-2 w-2 -translate-x-1/2 rounded-full ${
              pct >= r.pct ? "bg-accent" : "bg-line"
            }`}
            style={{ left: `${r.pct}%` }}
          />
        ))}
        <span
          className="absolute flex h-4 min-w-4 -translate-x-1/2 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-surface transition-[left] duration-500"
          style={{ left: `${Math.min(pct, 100)}%` }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}
