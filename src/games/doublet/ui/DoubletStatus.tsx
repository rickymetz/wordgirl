import { useEffect, useState } from "react";
import { formatDateKey } from "../../../lib/date";
import { useToday } from "../../../lib/useToday";
import {
  displayStreak,
  loadDailyProgress,
  loadStats,
} from "../state/persistence";

export function DoubletStatus() {
  const today = useToday();
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [easyP, medP, hardP, stats] = await Promise.all([
        loadDailyProgress(today, "easy"),
        loadDailyProgress(today, "medium"),
        loadDailyProgress(today, "hard"),
        loadStats(),
      ]);
      if (cancelled) return;

      const solvedCount = [easyP, medP, hardP].filter((p) => p?.solved).length;
      const anyStarted = [easyP, medP, hardP].some(
        (p) => p && p.placed.length > 0,
      );

      const state =
        solvedCount === 3
          ? "All solved"
          : solvedCount > 0
            ? `${solvedCount}/3 solved`
            : anyStarted
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
