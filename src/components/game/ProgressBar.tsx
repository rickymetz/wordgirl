/**
 * The game-screen progress rail: a thin accent fill over a `line` track,
 * checkpoint dots that fill as the bar passes them, and the count at the
 * right. Crosshatch's ProgressBar (crosshatch/ui) is the original; this is
 * the kit copy, with the checkpoints as a prop (percentages, 0-100).
 *
 * `label` names the count for a screen reader ("sets found"); the visible
 * count stays the bare "2/5" every sibling shows.
 */
export function ProgressBar({
  found,
  total,
  checkpoints,
  label,
}: {
  found: number;
  total: number;
  checkpoints: readonly number[];
  label?: string;
}) {
  const pct = total === 0 ? 0 : (found / total) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-4 flex-1 items-center" aria-hidden>
        <div className="absolute inset-x-0 h-1 rounded-full bg-line" />
        <div
          className="absolute left-0 h-1 rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
        {checkpoints.map((cp) => (
          <span
            key={cp}
            className={`absolute h-2 w-2 -translate-x-1/2 rounded-full ${pct >= cp ? "bg-accent" : "bg-line"}`}
            style={{ left: `${cp}%` }}
          />
        ))}
      </div>
      <span className="shrink-0 text-xs font-medium text-ink-soft tabular-nums">
        {found}/{total}
        {label && <span className="sr-only"> {label}</span>}
      </span>
    </div>
  );
}

/** One checkpoint per item: for a board where every set is a step. */
export function everyStep(total: number): number[] {
  return Array.from({ length: total }, (_, k) => ((k + 1) / total) * 100);
}
