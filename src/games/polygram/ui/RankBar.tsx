import type { GameState } from "../state/reducer";
import { regularPolygonClipPath } from "./polygonPath";

const levelColor = (size: number) => `var(--level-${size})`;

export function RankBar({ state }: { state: GameState }) {
  const { puzzle } = state;
  const levels = puzzle.levels;
  const n = levels.length;

  const current = levels[state.levelIndex];
  const foundInCurrent = current.words.filter((w) =>
    state.found.includes(w),
  ).length;
  const frac =
    state.phase === "done" ? 1 : foundInCurrent / current.words.length;
  const pct = Math.min(100, ((state.levelIndex + frac) / n) * 100);

  const gradient = `linear-gradient(to right, var(--color-line) 0%, ${levels
    .map((lvl, k) => `${levelColor(lvl.size)} ${((k + 1) / n) * 100}%`)
    .join(", ")})`;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-4 flex-1 items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-line" />
        {pct > 0 && (
          <div
            className="absolute left-0 h-1 overflow-hidden rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          >
            <div
              className="h-full"
              style={{ width: `${10000 / pct}%`, backgroundImage: gradient }}
            />
          </div>
        )}
        {levels.map((lvl, k) => (
          <span
            key={lvl.size}
            data-level={lvl.size}
            className="absolute h-3 w-3 -translate-x-1/2"
            style={{
              left: `${((k + 1) / n) * 100}%`,
              clipPath: regularPolygonClipPath(lvl.size),
              backgroundColor:
                state.levelIndex > k || state.phase === "done"
                  ? "var(--color-accent)"
                  : "var(--color-line)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
