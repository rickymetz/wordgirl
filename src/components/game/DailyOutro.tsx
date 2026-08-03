import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { games } from "../../games/registry";
import { useToday } from "../../lib/useToday";
import type { GameDefinition } from "../../games/types";

/**
 * What a results card owed the player and never gave them: the streak at
 * the moment it lands hardest, and the fact that other puzzles are still
 * open today. Every card used to end at Share, so the only way onward
 * from the highest-intent screen in the app was the Home button up in
 * the header.
 *
 * DAILY ONLY. An archive replay is not today's puzzle and a practice
 * board is not a day at all, so neither gets a streak or a nudge; the
 * tutorial has `TutorialDone` instead.
 *
 * A game with no `solvedToday` loader counts as done rather than as
 * open — a new game that forgets to add one is then quietly absent from
 * the list, which is a far smaller lie than telling everybody a puzzle
 * is waiting that may already be finished.
 */
export function DailyOutro({
  gameId,
  loadStreak,
}: {
  gameId: string;
  /** The game's own `displayStreak`, in days. */
  loadStreak: (today: string) => Promise<number>;
}) {
  const today = useToday();
  const [streak, setStreak] = useState(0);
  const [open, setOpen] = useState<GameDefinition[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadStreak(today)
      .catch(() => 0)
      .then((n) => {
        if (!cancelled) setStreak(n);
      });
    void Promise.all(
      games
        .filter((g) => g.id !== gameId)
        .map(async (g) => ({
          game: g,
          done: g.solvedToday ? await g.solvedToday(today).catch(() => true) : true,
        })),
    ).then((rows) => {
      if (cancelled) return;
      setOpen(rows.filter((r) => !r.done).map((r) => r.game));
    });
    return () => {
      cancelled = true;
    };
    // The loaders close over module imports only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, gameId]);

  // Nothing to say until the reads land — rendering "all done" first and
  // correcting it a moment later would flash the wrong answer.
  if (open === null) return null;

  return (
    <div className="flex flex-col items-center gap-1 pt-1 text-sm">
      {streak > 1 && (
        <p className="font-semibold text-ink">{streak}-day streak</p>
      )}
      {open.length > 0 ? (
        <p className="text-ink-soft">
          Still open today:{" "}
          {open.map((g, i) => (
            <span key={g.id}>
              {i > 0 && " · "}
              <Link
                to={`/games/${g.id}`}
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                {g.name}
              </Link>
            </span>
          ))}
        </p>
      ) : (
        <p className="text-ink-soft">
          Every puzzle done today. A new set lands at midnight.
        </p>
      )}
    </div>
  );
}
