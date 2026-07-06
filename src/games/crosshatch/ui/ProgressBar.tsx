import { RANKS, SOLVE_PCT, rankFor } from "../engine/scoring";

/**
 * Combo progress with rank checkpoints. The solve checkpoint (90%)
 * is the ringed one — reaching it marks the day solved; the last dot
 * is the perfect sweep.
 */
export function ProgressBar({
  found,
  total,
}: {
  found: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : (found / total) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm font-normal text-ink-soft">
        {rankFor(found, total)}
      </span>
      <div className="relative flex h-4 flex-1 items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-line" />
        <div
          className="absolute left-0 h-1 rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
        {RANKS.filter((r) => r.pct > 0).map((r) => (
          <span
            key={r.pct}
            className={`absolute -translate-x-1/2 rounded-full ${
              r.pct === SOLVE_PCT ? "h-3 w-3 border-2" : "h-2 w-2"
            } ${
              pct >= r.pct
                ? "border-accent bg-accent"
                : "border-line bg-line"
            } ${r.pct === SOLVE_PCT && pct < r.pct ? "bg-surface" : ""}`}
            style={{ left: `${r.pct}%` }}
          />
        ))}
      </div>
      <span className="shrink-0 text-xs font-medium text-ink-soft">
        {found}/{total}
      </span>
    </div>
  );
}
