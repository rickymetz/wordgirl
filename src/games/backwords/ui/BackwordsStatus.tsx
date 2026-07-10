import { useEffect, useState } from "react";
import { formatDateKey } from "../../../lib/date";
import { useToday } from "../../../lib/useToday";
import { displayStreak, loadDailyProgress, loadStats } from "../state/persistence";

/** Hub-card status: today's date, front and center, plus play state. */
export function BackwordsStatus() {
  const today = useToday();
  const [line, setLine] = useState<string | null>(null);

  // Reloads on midnight rollover and PWA resume, not just on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [daily, stats] = await Promise.all([
        loadDailyProgress(today),
        loadStats(),
      ]);
      if (cancelled) return;
      // Only real state earns a line — a fresh day shows just the date.
      const state = daily?.solved
        ? "Solved ✓"
        : daily && daily.rows.length > 0
          ? "In progress"
          : null;
      const streakDays = displayStreak(stats, today);
      const streak = streakDays > 1 ? `${streakDays}-day streak` : null;
      setLine([state, streak].filter(Boolean).join(" · ") || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [today]);

  return (
    <div className="mt-3">
      <p className="text-lg leading-tight font-bold text-accent">
        {formatDateKey(today)}
      </p>
      {line && (
        <p className="mt-0.5 text-sm font-semibold text-accent/75">{line}</p>
      )}
    </div>
  );
}
