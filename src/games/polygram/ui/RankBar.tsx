import { rankFor } from "../engine/scoring";
import type { GameState } from "../state/reducer";
import { regularPolygonClipPath } from "./polygonPath";

/** Level colors (light/dark) for sizes 3–10 — pride flag order. */
const LEVEL_COLORS: Record<number, string> = {
  3: "light-dark(#dc2626, #f87171)", // red
  4: "light-dark(#ea580c, #fb923c)", // orange
  5: "light-dark(#ca8a04, #facc15)", // yellow
  6: "light-dark(#16a34a, #4ade80)", // green
  7: "light-dark(#2563eb, #60a5fa)", // blue
  8: "light-dark(#7e22ce, #c084fc)", // purple
  9: "light-dark(#db2777, #f472b6)", // pink
  10: "light-dark(#0d9488, #2dd4bf)", // turquoise
};

/**
 * Level progress bar: one segment per level in that level's color, with
 * the level's polygon as the checkpoint at its end. Cleared levels are
 * fully revealed; the current level's segment fills with words found.
 */
export function RankBar({ state }: { state: GameState }) {
  const { puzzle } = state;
  const levels = puzzle.levels;
  const n = levels.length;

  // Overall fill: completed levels plus fraction of the current one.
  const current = levels[state.levelIndex];
  const foundInCurrent = current.words.filter((w) =>
    state.found.includes(w),
  ).length;
  const frac =
    state.phase === "done" ? 1 : foundInCurrent / current.words.length;
  const pct = Math.min(100, ((state.levelIndex + frac) / n) * 100);

  // Smooth gradient with a stop at each level checkpoint: background at
  // the far left fading to amethyst at the triangle, then emerald at
  // the square, ruby, sapphire… along the polygon markers.
  const gradient = `linear-gradient(to right, var(--color-line) 0%, ${levels
    .map((lvl, k) => `${LEVEL_COLORS[lvl.size]} ${((k + 1) / n) * 100}%`)
    .join(", ")})`;

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm font-normal text-ink-soft">
        {rankFor(state.score, puzzle)}
      </span>
      <div className="relative flex h-4 flex-1 items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-line" />
        {pct > 0 && (
          <div
            className="absolute left-0 h-1 overflow-hidden rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          >
            {/* Full-bar gradient clipped by the fill width, so segment
                colors stay aligned with their levels. */}
            <div
              className="h-full"
              style={{ width: `${10000 / pct}%`, backgroundImage: gradient }}
            />
          </div>
        )}
        {levels.map((lvl, k) => (
          // Each level's polygon marks the end of its segment, lighting
          // up in its color once the level is cleared.
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
