import type { Puzzle } from "../engine/types";
import { RANKS, rankFor } from "../engine/scoring";
import { regularPolygonClipPath } from "./polygonPath";

interface Props {
  score: number;
  puzzle: Puzzle;
}

/** Checkpoint colors (light/dark), matching levels 3–8. */
const STOP_COLORS = [
  "light-dark(#7e22ce, #c084fc)", // amethyst
  "light-dark(#059669, #34d399)", // emerald
  "light-dark(#be123c, #fb7185)", // ruby
  "light-dark(#1d4ed8, #60a5fa)", // sapphire
  "light-dark(#ca8a04, #facc15)", // citrine
  "light-dark(#0d9488, #2dd4bf)", // turquoise
];

// One gradient across the whole bar with a stop per rank checkpoint —
// the advancing fill reveals each checkpoint's color as it approaches.
const GRADIENT = `linear-gradient(to right, ${RANKS.map(
  (r, k) => `${STOP_COLORS[k]} ${r.pct}%`,
).join(", ")})`;

export function RankBar({ score, puzzle }: Props) {
  const rank = rankFor(score, puzzle);
  const pct = Math.min(
    100,
    puzzle.maxScore === 0 ? 0 : (score / puzzle.maxScore) * 100,
  );

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm font-semibold">{rank}</span>
      <div className="relative flex h-4 flex-1 items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-line" />
        {pct > 0 && (
          <div
            className="absolute left-0 h-1 overflow-hidden rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          >
            {/* Full-bar gradient clipped by the fill width, so segment
                colors line up with the checkpoints. */}
            <div
              className="h-full"
              style={{ width: `${10000 / pct}%`, backgroundImage: GRADIENT }}
            />
          </div>
        )}
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
      </div>
    </div>
  );
}
