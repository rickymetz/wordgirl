import { useEffect, useState } from "react";
import { localDateKey } from "../../../lib/date";
import { loadDailyProgress, loadStats } from "../state/persistence";

/** Hub-card status line: today's state plus the current streak. */
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

  if (!line) return null;
  return <p className="mt-2 text-sm font-semibold text-accent">{line}</p>;
}
