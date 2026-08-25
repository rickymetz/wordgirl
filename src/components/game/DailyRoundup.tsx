import { useEffect, useState } from "react";
import { games } from "../../games/registry";
import {
  buildRoundupText,
  roundupDetail,
  type RoundupEntry,
} from "../../lib/roundup";
import { ShareButton } from "../ShareButton";

/**
 * Every game's result for `today`, or null until they are ALL in — one
 * missing entry (a game not finished, or a game with no `roundupEntry`
 * loader) hides the roundup entirely. That all-or-nothing gate is the
 * whole point: the roundup only exists once the day is done, so "have I
 * every entry" and "is the day complete" are the same question, answered
 * once. Entries come back in registry order, so the card and the share
 * string read the games the same way every day.
 */
export function useDailyRoundup(today: string): RoundupEntry[] | null {
  const [entries, setEntries] = useState<RoundupEntry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Re-reading a new day starts blank rather than flashing yesterday's.
    setEntries(null);
    void Promise.all(
      games.map((g) =>
        g.roundupEntry ? g.roundupEntry(today).catch(() => null) : null,
      ),
    ).then((rows) => {
      if (cancelled) return;
      setEntries(rows.every((r) => r !== null) ? (rows as RoundupEntry[]) : null);
    });
    return () => {
      cancelled = true;
    };
  }, [today]);
  return entries;
}

/** The day's share string, or null until the day is done — for surfaces
 *  (the finish outro) that want the Share affordance without the card. */
export function useRoundupShareText(today: string): string | null {
  const entries = useDailyRoundup(today);
  return entries ? buildRoundupText(today, entries) : null;
}

/**
 * The full roundup card: a tinted panel listing each game's result and
 * one button that shares the whole day. Renders nothing until every
 * puzzle is done, so it is safe to mount unconditionally (the hub does).
 *
 * Emoji stay out of the visible rows — they ride the SHARE string only,
 * the house rule — so each row is `name · metric · time`, the name in
 * its own element beside the plain detail.
 */
export function DailyRoundup({ today }: { today: string }) {
  const entries = useDailyRoundup(today);
  if (!entries) return null;
  return (
    <section
      aria-label="Today's roundup"
      className="flex flex-col gap-3 rounded-2xl bg-surface-tint p-4"
    >
      <h2 className="text-center font-semibold text-ink">Today&apos;s roundup</h2>
      <ul className="flex flex-col gap-1.5 text-sm">
        {entries.map((e) => (
          <li key={e.name} className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-ink">{e.name}</span>
            <span className="tabular-nums text-ink-soft">{roundupDetail(e)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-center pt-1">
        <ShareButton text={buildRoundupText(today, entries)} gameId="roundup" />
      </div>
    </section>
  );
}
