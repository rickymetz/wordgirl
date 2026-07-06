import { useEffect, useState } from "react";
import { formatDateKey, localDateKey } from "../../../lib/date";
import { loadDailyProgress, loadStats } from "../state/persistence";

/** Hub-card status: today's date, front and center, plus play state. */
export function CrosshatchStatus() {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dateKey = localDateKey();
      const [daily, stats] = await Promise.all([
        loadDailyProgress(dateKey),
        loadStats(),
      ]);
      if (cancelled) return;
      // Only real state earns a line — a fresh day shows just the date.
      const today = daily?.solved
        ? "Solved ✓"
        : daily && daily.foundWords.length > 0
          ? "In progress"
          : null;
      const streak =
        stats.currentStreak > 1 ? `${stats.currentStreak}-day streak` : null;
      setLine([today, streak].filter(Boolean).join(" · ") || null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-3">
      <p className="text-lg leading-tight font-bold text-accent">
        {formatDateKey(localDateKey())}
      </p>
      {line && (
        <p className="mt-0.5 text-sm font-semibold text-accent/75">{line}</p>
      )}
    </div>
  );
}
