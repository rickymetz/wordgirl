const CHECKPOINTS = [25, 50, 70, 90, 100];

import { Sparkle } from "lucide-react";

/**
 * The COUNT is list words only (`found/total`), with the bonus tally as
 * a compact star and number after it, so the count and the word list
 * add up at a glance (Polygram's rule). The RAIL fills with `progress`
 * — list + bonus finds, capped — because that is what opens Hold to
 * finish: a full rail with a short count means "you can finish here".
 */
export function ProgressBar({
  found,
  total,
  progress = found,
  bonus = 0,
}: {
  found: number;
  total: number;
  progress?: number;
  bonus?: number;
}) {
  const pct = total === 0 ? 0 : (progress / total) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-4 flex-1 items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-line" />
        <div
          className="absolute left-0 h-1 rounded-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
        {CHECKPOINTS.map((cp) => (
          <span
            key={cp}
            className={`absolute h-2 w-2 -translate-x-1/2 rounded-full ${
              pct >= cp ? "bg-accent" : "bg-line"
            }`}
            style={{ left: `${cp}%` }}
          />
        ))}
      </div>
      <span className="shrink-0 text-xs font-medium text-ink-soft">
        {found}/{total}
        {bonus > 0 && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 text-accent">
            <Sparkle aria-hidden className="h-3 w-3" fill="currentColor" strokeWidth={1} />
            {bonus}
            <span className="sr-only"> bonus</span>
          </span>
        )}
      </span>
    </div>
  );
}
