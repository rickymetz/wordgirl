import { solveTarget } from "../engine/scoring";

const CHECKPOINTS = [25, 50, 70, 90, 100];

export function ProgressBar({
  found,
  total,
}: {
  found: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : (found / total) * 100;
  const solvePct = total === 0 ? 100 : (solveTarget(total) / total) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-4 flex-1 items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-line" />
        <div
          className="absolute left-0 h-1 rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
        {CHECKPOINTS.filter(
          (cp) => Math.abs(cp - solvePct) > 3,
        ).map((cp) => (
          <span
            key={cp}
            className={`absolute h-2 w-2 -translate-x-1/2 rounded-full ${
              pct >= cp ? "bg-accent" : "bg-line"
            }`}
            style={{ left: `${cp}%` }}
          />
        ))}
        <span
          className={`absolute h-3 w-3 -translate-x-1/2 rounded-full border-2 ${
            pct >= solvePct
              ? "border-accent bg-accent"
              : "border-line bg-surface"
          }`}
          style={{ left: `${solvePct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-medium text-ink-soft">
        {found}/{total}
      </span>
    </div>
  );
}
