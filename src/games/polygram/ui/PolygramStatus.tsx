import { useEffect, useState } from "react";
import { formatDateKey, localDateKey } from "../../../lib/date";
import { loadDailyProgress, loadStats } from "../state/persistence";

/** Hub-card status: today's date, front and center, plus play state. */
export function PolygramStatus() {
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
      const today = daily?.completed
        ? "Today's puzzle solved ✓"
        : daily
          ? "Today's puzzle in progress"
          : "New puzzle today";
      const streak =
        stats.currentStreak > 1 ? ` · ${stats.currentStreak}-day streak` : "";
      setLine(today + streak);
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
      {line && <p className="mt-0.5 text-sm font-semibold text-accent/75">{line}</p>}
    </div>
  );
}
