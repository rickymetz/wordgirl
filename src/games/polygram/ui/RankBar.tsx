import type { Puzzle } from "../engine/types";
import { RANKS, rankFor } from "../engine/scoring";
import { regularPolygonClipPath } from "./polygonPath";

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
        {RANKS.map((r, k) => (
          // Checkpoints are the polygon sequence itself — triangle,
          // square, pentagon… — each in its level's color once reached.
          <span
            key={r.title}
            data-level={3 + k}
            className="absolute h-3 w-3 -translate-x-1/2"
            style={{
              left: `${r.pct}%`,
              clipPath: regularPolygonClipPath(3 + k),
              backgroundColor:
                pct >= r.pct ? "var(--color-accent)" : "var(--color-line)",
            }}
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
