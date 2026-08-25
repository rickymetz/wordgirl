import { useEffect, useState } from "react";
import { games } from "../../games/registry";
import {
  buildRoundupText,
  consecutiveDaysEndingToday,
  roundupDetail,
  roundupSummary,
  type RoundupEntry,
} from "../../lib/roundup";
import { ShareButton } from "../ShareButton";

interface Roundup {
  entries: RoundupEntry[];
  /** Days in a row, ending today, that every game was finished. */
  streak: number;
}

/**
 * Every game's result for `today` plus the all-games streak, or null until
 * the day is done. The all-or-nothing gate is the whole point: the roundup
 * only exists once every game returns an entry (a missing game — unfinished
 * or with no `roundupEntry` loader — keeps it hidden), so "have I every
 * entry" and "is the day complete" are one question. Entries come back in
 * registry order, so the card and the share string read the same each day.
 */
export function useDailyRoundup(today: string): Roundup | null {
  const [roundup, setRoundup] = useState<Roundup | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Re-reading a new day starts blank rather than flashing yesterday's.
    setRoundup(null);
    void (async () => {
      const rows = await Promise.all(
        games.map((g) =>
          g.roundupEntry ? g.roundupEntry(today).catch(() => null) : null,
        ),
      );
      if (cancelled) return;
      if (!rows.every((r) => r !== null)) return;
      const entries = rows as RoundupEntry[];

      // The streak needs each game's full history; only paid once the day
      // is complete (this branch), which is at most once per day on the hub.
      const lists = await Promise.all(
        games.map((g) =>
          g.solvedDates ? g.solvedDates().catch(() => []) : Promise.resolve([]),
        ),
      );
      if (cancelled) return;
      const counts = new Map<string, number>();
      for (const list of lists) {
        for (const date of new Set(list)) {
          counts.set(date, (counts.get(date) ?? 0) + 1);
        }
      }
      // A date counts only when EVERY game finished it.
      const complete = new Set(
        [...counts.entries()]
          .filter(([, n]) => n === games.length)
          .map(([date]) => date),
      );
      setRoundup({
        entries,
        streak: consecutiveDaysEndingToday(today, complete),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [today]);
  return roundup;
}

/** The day's share string, or null until the day is done — for surfaces
 *  (the finish outro) that want the Share affordance without the card. */
export function useRoundupShareText(today: string): string | null {
  const roundup = useDailyRoundup(today);
  return roundup
    ? buildRoundupText(today, roundup.entries, roundup.streak)
    : null;
}

/**
 * The "every puzzle done" banner: a rainbow border sweeping all five game
 * accents (the app's whole palette at once, the one place it earns being
 * loud) around a neutral card listing each result and sharing the day.
 * Renders nothing until the day is complete, so the hub mounts it above
 * the game cards unconditionally.
 *
 * Emoji stay out of the visible rows — they ride the SHARE string only,
 * the house rule — so each row is `name · metric · time · hints`.
 */
export function DailyRoundup({ today }: { today: string }) {
  const roundup = useDailyRoundup(today);
  if (!roundup) return null;
  const { entries, streak } = roundup;
  return (
    <section
      aria-label="Today's roundup"
      // The gradient is the border: a 3px sweep showing only where the
      // inner card doesn't cover it. rounded-3xl matches the game cards.
      className="rounded-3xl p-[3px]"
      style={{ background: "var(--roundup-rainbow)" }}
    >
      <div className="flex flex-col gap-3 rounded-[calc(1.5rem-3px)] bg-surface-tint p-4">
        <div className="text-center">
          <h2 className="font-semibold text-ink">Every puzzle done today</h2>
          <p className="text-sm text-ink-soft">{roundupSummary(entries, streak)}</p>
        </div>
        <ul className="flex flex-col gap-1.5 text-sm">
          {entries.map((e) => (
            <li
              key={e.name}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="shrink-0 font-semibold text-ink">{e.name}</span>
              <span className="text-right tabular-nums text-ink-soft">
                {roundupDetail(e)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-center pt-1">
          <ShareButton
            text={buildRoundupText(today, entries, streak)}
            gameId="roundup"
          />
        </div>
      </div>
    </section>
  );
}
