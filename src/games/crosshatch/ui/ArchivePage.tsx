import { use, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HomeLink } from "../../../components/HomeLink";
import {
  dateKeyRange,
  formatDateKey,
  formatDuration,
  localDateKey,
  previousDateKey,
} from "../../../lib/date";
import type { Dictionary } from "../../../lib/words/dictionary";
import { loadDictionary } from "../../../lib/words/loader";
import { rankFor, uniqueWords } from "../engine/scoring";
import { generateCrosshatch, dailySeed } from "../engine/generator";
import {
  ARCHIVE_EPOCH,
  loadAllDailyProgress,
  loadStats,
  type ArchivedDay,
  type CrosshatchStats,
} from "../state/persistence";

// rank needs the day's word total; cache so each date generates at
// most once per session instead of on every list render.
const rankCache = new Map<string, string>();
function rankForDay(
  dict: Dictionary,
  dateKey: string,
  found: number,
): { rank: string; total: number } {
  const key = `${dateKey}:${found}`;
  let cached = rankCache.get(key);
  let total = totalCache.get(dateKey);
  if (cached === undefined || total === undefined) {
    total = uniqueWords(
      generateCrosshatch(dict, dailySeed(dateKey)).combos,
    ).length;
    totalCache.set(dateKey, total);
    cached = rankFor(found, total);
    rankCache.set(key, cached);
  }
  return { rank: cached, total };
}
const totalCache = new Map<string, number>();

/** Past daily puzzles: calendar mosaic + played days, newest first. */
export default function ArchivePage() {
  const [progress, setProgress] = useState<Record<
    string,
    ArchivedDay
  > | null>(null);
  const [stats, setStats] = useState<CrosshatchStats | null>(null);

  useEffect(() => {
    void loadAllDailyProgress().then(setProgress);
    void loadStats().then(setStats);
  }, []);

  const yesterday = previousDateKey(localDateKey());
  const dates =
    yesterday >= ARCHIVE_EPOCH
      ? dateKeyRange(ARCHIVE_EPOCH, yesterday).reverse()
      : [];
  // The calendar covers every day; the list below repeats only days
  // with actual results (it's the scoreboard: rank, words, time).
  const playedDates = dates.filter((d) => {
    const saved = progress?.[d];
    return saved && (saved.solved || saved.foundWords.length > 0);
  });

  return (
    <div
      data-level={10}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-12"
    >
      <header className="flex items-center justify-between pt-6 pb-2">
        <HomeLink />
        <Link
          to="/games/crosshatch"
          className="text-sm font-semibold text-accent"
        >
          Today's puzzle
        </Link>
      </header>

      <div className="pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Archive</h1>
      </div>

      {stats && stats.played > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3 rounded-2xl bg-surface-tint px-5 py-4">
          <Stat label="Streak" value={stats.currentStreak} />
          <Stat label="Best streak" value={stats.bestStreak} />
          <Stat label="Solved" value={stats.solved} />
          <Stat label="Played" value={stats.played} />
          <Stat label="Best rank" value={stats.bestRank ?? "—"} />
          <Stat label="Words" value={stats.totalWords} />
        </div>
      )}

      <CalendarMosaic progress={progress ?? {}} />

      <div className="mt-5 flex flex-col gap-3">
        {progress &&
          playedDates.map((dateKey) => (
            <ArchiveRow
              key={dateKey}
              dateKey={dateKey}
              saved={progress[dateKey]}
            />
          ))}
      </div>
    </div>
  );
}

/**
 * Month-grid mosaic of the archive: each day is a tappable cell colored
 * by status. Bounded by the archive epoch and the current month.
 */
function CalendarMosaic({
  progress,
}: {
  progress: Record<string, ArchivedDay>;
}) {
  const today = localDateKey();
  const currentMonth = today.slice(0, 7);
  const epochMonth = ARCHIVE_EPOCH.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);

  const [year, monthNum] = month.split("-").map(Number);
  // Noon avoids DST edges, matching lib/date conventions.
  const anchor = new Date(year, monthNum - 1, 1, 12);
  const dayCount = new Date(year, monthNum, 0).getDate();
  const leadingBlanks = anchor.getDay(); // 0 = Sunday
  const label = anchor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const shiftMonth = (delta: number) => {
    const d = new Date(year, monthNum - 1 + delta, 1, 12);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  return (
    <div className="rounded-2xl bg-surface-tint px-4 py-4">
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={month <= epochMonth}
          aria-label="Previous month"
          className="-m-2 p-2 text-lg leading-none text-ink disabled:opacity-25"
        >
          ‹
        </button>
        <div className="text-sm font-semibold">{label}</div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={month >= currentMonth}
          aria-label="Next month"
          className="-m-2 p-2 text-lg leading-none text-ink disabled:opacity-25"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            aria-hidden
            className="pb-1 text-center text-xs font-medium text-ink-soft"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: dayCount }, (_, i) => {
          const day = i + 1;
          const dateKey = `${month}-${String(day).padStart(2, "0")}`;
          return (
            <DayCell
              key={dateKey}
              dateKey={dateKey}
              day={day}
              today={today}
              saved={progress[dateKey]}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayCell({
  dateKey,
  day,
  today,
  saved,
}: {
  dateKey: string;
  day: number;
  today: string;
  saved?: ArchivedDay;
}) {
  const base =
    "flex aspect-square items-center justify-center rounded-lg text-sm";
  const playable = dateKey >= ARCHIVE_EPOCH && dateKey <= today;
  if (!playable) {
    // Before the archive began, or still in the future.
    return (
      <div aria-hidden className={`${base} text-ink-soft opacity-40`}>
        {day}
      </div>
    );
  }

  const solved = saved?.solved ?? false;
  const started = !solved && (saved?.foundWords.length ?? 0) > 0;
  const status = solved ? "solved" : started ? "in progress" : "not played";
  const isToday = dateKey === today;
  const tone = solved
    ? "bg-accent font-semibold text-surface"
    : started
      ? "bg-accent-soft font-medium text-ink"
      : "bg-tile font-medium text-ink";
  return (
    <Link
      to={isToday ? "/games/crosshatch" : `/games/crosshatch/archive/${dateKey}`}
      aria-label={`${formatDateKey(dateKey)} — ${status}`}
      className={`${base} ${tone} transition-transform active:scale-90 ${
        isToday ? "ring-2 ring-accent" : ""
      }`}
    >
      {day}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-game text-lg text-accent">{value}</div>
      <div className="text-xs text-ink-soft">{label}</div>
    </div>
  );
}

function ArchiveRow({
  dateKey,
  saved,
}: {
  dateKey: string;
  saved?: ArchivedDay;
}) {
  let status = "Not played";
  let statusClass = "text-ink-soft";
  const solved = saved?.solved ?? false;
  if (saved?.solved) {
    // A stale save was played against an older dictionary: its result is
    // real history but doesn't map onto the current puzzle's combos.
    if (saved.stale) {
      status = `Solved · ${saved.foundWords.length} words · older words`;
    } else {
      // `use` is conditional on purpose: the dictionary only loads (and
      // suspends) when a rank is actually displayed.
      const { rank, total } = rankForDay(
        use(loadDictionary()),
        dateKey,
        saved.foundWords.length,
      );
      status = `${rank} · ${saved.foundWords.length}/${total}`;
    }
    statusClass = "text-accent";
  } else if (saved && saved.foundWords.length > 0) {
    status = `In progress · ${saved.foundWords.length} words`;
    statusClass = "text-ink";
  }

  return (
    <Link
      to={`/games/crosshatch/archive/${dateKey}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-raised px-5 py-4 transition-transform active:scale-[0.98]"
    >
      <div className="min-w-0">
        <div className="font-semibold">{formatDateKey(dateKey)}</div>
        <div className={`mt-0.5 truncate text-sm font-medium ${statusClass}`}>
          {status}
        </div>
      </div>
      {solved ? (
        <span className="shrink-0 font-game text-base text-accent">
          {formatDuration(saved?.elapsedMs ?? 0)}
        </span>
      ) : (
        <span className="shrink-0 text-ink-soft" aria-hidden>
          ›
        </span>
      )}
    </Link>
  );
}
