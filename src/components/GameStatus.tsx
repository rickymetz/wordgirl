import { useEffect, useState } from "react";
import { formatDateKey } from "../lib/date";
import { useToday } from "../lib/useToday";

/**
 * The hub-card status block every game shares: today's date, front
 * and center, plus a play-state line ("Solved ✓ · 3-day streak").
 * Each game contributes only its loaders — the layout, streak
 * pluralization, and midnight-rollover reload live here once.
 */
export function GameStatus({
  loadState,
  loadStreak,
}: {
  /** Game-specific play state for today ("Solved ✓", "2/3 solved",
   * "In progress"), or null when the day is untouched. */
  loadState: (today: string) => Promise<string | null>;
  /** The game's displayStreak, in days. */
  loadStreak: (today: string) => Promise<number>;
}) {
  const today = useToday();
  const [line, setLine] = useState<string | null>(null);

  // Reloads on midnight rollover and PWA resume, not just on mount —
  // a stale "Solved ✓" for the new day is a broken promise.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadState(today), loadStreak(today)]).then(
      ([state, streakDays]) => {
        if (cancelled) return;
        const streak = streakDays > 1 ? `${streakDays}-day streak` : null;
        setLine([state, streak].filter(Boolean).join(" · ") || null);
      },
    );
    return () => {
      cancelled = true;
    };
    // The loaders close over module imports only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
