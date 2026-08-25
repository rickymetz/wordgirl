import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { games } from "../../games/registry";
import {
  buildRoundupText,
  roundupAggregateDetail,
  roundupDetail,
  roundupLevelDetail,
  roundupSummary,
  streakEndingToday,
  type RoundupEntry,
} from "../../lib/roundup";
import {
  loadRoundupCelebrated,
  loadRoundupDismissed,
  markRoundupCelebrated,
  markRoundupDismissed,
} from "../../lib/roundupCelebration";
import { ShareButton } from "../ShareButton";
import { ConfettiOverlay } from "../ConfettiOverlay";

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

      // Walk back from today, stopping at the first day some game didn't
      // finish — reads only the days the streak spans, not all history.
      const isCompleteOn = async (dateKey: string) => {
        const solved = await Promise.all(
          games.map((g) =>
            g.solvedOn ? g.solvedOn(dateKey).catch(() => false) : false,
          ),
        );
        return solved.every(Boolean);
      };
      const streak = await streakEndingToday(today, isCompleteOn);
      if (cancelled) return;
      setRoundup({ entries, streak });
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
  // null while the per-day dismissed flag is still loading — render nothing
  // until we know, so a dismissed banner never flashes in and back out.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDismissed(null);
    void loadRoundupDismissed(today).then((d) => {
      if (!cancelled) setDismissed(d);
    });
    return () => {
      cancelled = true;
    };
  }, [today]);

  // Fire the confetti ONCE, the first time the completed banner is shown for
  // the day (and only if not dismissed). markCelebrated persists it so a
  // reload or a later hub visit doesn't replay it.
  useEffect(() => {
    if (!roundup || dismissed !== false) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    void loadRoundupCelebrated(today).then((done) => {
      if (cancelled || done) return;
      void markRoundupCelebrated(today);
      setCelebrate(true);
      // Unmount the canvas once the burst (1.4s) has finished; the banner
      // then just sits with its gently drifting border.
      timer = setTimeout(() => {
        if (!cancelled) setCelebrate(false);
      }, 1600);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [roundup, dismissed, today]);

  if (!roundup || dismissed !== false) return null;
  const { entries, streak } = roundup;
  return (
    <>
      {celebrate && <ConfettiOverlay />}
      <section
        aria-label="Today's roundup"
        // The gradient is the border: a 3px sweep showing only where the
        // inner card doesn't cover it, slowly panning (roundup-rainbow-border).
        // rounded-3xl matches the game cards.
        className="roundup-rainbow-border rounded-3xl p-[3px]"
      >
        <div className="relative flex flex-col gap-3 rounded-[calc(1.5rem-3px)] bg-surface-tint p-4">
          <button
            type="button"
            onClick={() => {
              void markRoundupDismissed(today);
              setDismissed(true);
            }}
            aria-label="Dismiss roundup"
            // 44px tap target via the ::after expansion; the glyph is small.
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-ink-soft active:scale-90 after:absolute after:-inset-2.5"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
          <div className="text-center">
            {/* font-game is Rubik Mono One, and follows the Font setting to
                the accessible face automatically. */}
            <h2 className="text-balance px-6 font-game text-lg text-ink">
              All Puzzles Solved Today
            </h2>
            <p className="pt-1 text-sm text-ink-soft">
              {roundupSummary(entries, streak)}
            </p>
          </div>
          <ul className="flex flex-col gap-1.5 text-sm">
            {entries.map((e) =>
              e.levels && e.unit ? (
                // Multi-level game: a header row with the game's COMBINED
                // total, then a smaller sub-row per level below it.
                <li key={e.name} className="flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="shrink-0 font-semibold text-ink">
                      {e.name}
                    </span>
                    <span className="text-right tabular-nums text-ink-soft">
                      {roundupAggregateDetail(e)}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-0.5 pl-3 text-xs">
                    {e.levels.map((lv) => (
                      <li
                        key={lv.label}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="shrink-0 text-ink-soft">{lv.label}</span>
                        <span className="text-right tabular-nums text-ink-soft">
                          {roundupLevelDetail(e.unit!, lv)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li
                  key={e.name}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="shrink-0 font-semibold text-ink">{e.name}</span>
                  <span className="text-right tabular-nums text-ink-soft">
                    {roundupDetail(e)}
                  </span>
                </li>
              ),
            )}
          </ul>
          <div className="flex justify-center pt-1">
            <ShareButton
              text={buildRoundupText(today, entries, streak)}
              gameId="roundup"
            />
          </div>
        </div>
      </section>
    </>
  );
}
