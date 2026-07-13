import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HomeLink } from "./HomeLink";
import {
  dateKeyRange,
  formatDateKey,
  formatDuration,
  localDateKey,
  previousDateKey,
} from "../lib/date";

/** The fields every game's archived-day record must expose. */
export interface ArchiveDayBase {
  dateKey: string;
  foundWords: string[];
  elapsedMs: number;
  /** Played against an older dictionary (historical, result-only). */
  stale: boolean;
}

/**
 * Everything game-specific about an archive page. A new game writes
 * ONE of these and renders <GameArchive config={...} /> — the layout,
 * colors, calendar, and row styling all come from here, so every
 * game's archive looks and behaves the same by construction.
 */
export interface GameArchiveConfig<Day extends ArchiveDayBase, Stats> {
  /** Route segment: /games/<gameId> and /games/<gameId>/archive/<date>. */
  gameId: string;
  /** Palette key for data-level — the game's hub cluster accent
   * (same value as its GameDefinition.accentLevel). */
  accent: number | string;
  /** First daily puzzle — the calendar and list reach back to here. */
  epoch: string;
  loadAllDays: () => Promise<Record<string, Day>>;
  loadStats: () => Promise<Stats>;
  /** Show the stats grid at all (usually stats.played > 0). */
  hasPlayed: (stats: Stats) => boolean;
  /** The six stat tiles, in display order. */
  statTiles: (stats: Stats) => { label: string; value: string | number }[];
  /** The day reached its finish state (solved / completed). */
  isDone: (day: Day) => boolean;
  /** Scoreboard line under a played row's date. May suspend (use()). */
  rowStatus: (dateKey: string, day: Day) => { text: string; done: boolean };
}

/**
 * The house archive page: stats grid and calendar mosaic on the game's
 * accent-tinted panels, played days listed newest-first as scoreboard
 * rows. Style rules live HERE (see CLAUDE.md "Archive pages") — games
 * supply data through their config, never their own layout.
 */
export function GameArchive<Day extends ArchiveDayBase, Stats>({
  config,
}: {
  config: GameArchiveConfig<Day, Stats>;
}) {
  const [progress, setProgress] = useState<Record<string, Day> | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void config.loadAllDays().then(setProgress);
    void config.loadStats().then(setStats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.gameId]);

  const yesterday = previousDateKey(localDateKey());
  const dates =
    yesterday >= config.epoch
      ? dateKeyRange(config.epoch, yesterday).reverse()
      : [];
  // The calendar covers every day; the list below repeats only days
  // with actual results (it's the scoreboard).
  const playedDates = dates.filter((d) => {
    const saved = progress?.[d];
    return saved && (config.isDone(saved) || saved.foundWords.length > 0);
  });

  return (
    <div
      data-level={config.accent}
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-12 md:max-w-xl"
    >
      <header className="flex items-center justify-between pt-6 pb-2">
        <HomeLink />
        <Link
          to={`/games/${config.gameId}`}
          className="text-sm font-semibold text-accent"
        >
          Today's puzzle
        </Link>
      </header>

      <div className="pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Archive</h1>
      </div>

      {stats && config.hasPlayed(stats) && (
        <div className="mb-5 grid grid-cols-3 gap-3 rounded-2xl bg-surface-tint px-5 py-4">
          {config.statTiles(stats).map((tile) => (
            <Stat key={tile.label} label={tile.label} value={tile.value} />
          ))}
        </div>
      )}

      <CalendarMosaic config={config} progress={progress ?? {}} />

      <div className="mt-5 flex flex-col gap-3">
        {progress &&
          playedDates.map((dateKey) => (
            <ArchiveRow
              key={dateKey}
              config={config}
              dateKey={dateKey}
              day={progress[dateKey]}
            />
          ))}
      </div>
    </div>
  );
}

/**
 * Month-grid mosaic: each day is a tappable cell colored by status.
 * Bounded by the archive epoch and the current month.
 */
function CalendarMosaic<Day extends ArchiveDayBase, Stats>({
  config,
  progress,
}: {
  config: GameArchiveConfig<Day, Stats>;
  progress: Record<string, Day>;
}) {
  const today = localDateKey();
  const currentMonth = today.slice(0, 7);
  const epochMonth = config.epoch.slice(0, 7);
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
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="rounded-2xl bg-surface-tint px-4 py-4">
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={month <= epochMonth}
          aria-label="Previous month"
          className="-m-3 p-3 text-ink disabled:opacity-25"
        >
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </button>
        <div className="text-sm font-semibold">{label}</div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={month >= currentMonth}
          aria-label="Next month"
          className="-m-3 p-3 text-ink disabled:opacity-25"
        >
          <ChevronRight aria-hidden className="h-5 w-5" />
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
              config={config}
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

function DayCell<Day extends ArchiveDayBase, Stats>({
  config,
  dateKey,
  day,
  today,
  saved,
}: {
  config: GameArchiveConfig<Day, Stats>;
  dateKey: string;
  day: number;
  today: string;
  saved?: Day;
}) {
  const base =
    "flex aspect-square items-center justify-center rounded-lg text-sm";
  const playable = dateKey >= config.epoch && dateKey <= today;
  if (!playable) {
    // Before the archive began, or still in the future.
    return (
      <div aria-hidden className={`${base} text-ink-soft opacity-40`}>
        {day}
      </div>
    );
  }

  const done = saved ? config.isDone(saved) : false;
  const started = !done && (saved?.foundWords.length ?? 0) > 0;
  const status = done ? "solved" : started ? "in progress" : "not played";
  const isToday = dateKey === today;
  const tone = done
    ? "bg-accent font-semibold text-surface"
    : started
      ? "bg-accent-soft font-medium text-ink"
      : // The page neutral, hub-style: bg-tile is a warm grey tuned for
        // plain surfaces and reads as a stain on the accent-tinted panel.
        "bg-surface font-medium text-ink";
  return (
    <Link
      to={
        isToday
          ? `/games/${config.gameId}`
          : `/games/${config.gameId}/archive/${dateKey}`
      }
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
    // min-w-0 + truncate: a long mono value (AMAZING) must ellipsize
    // inside its grid column, not collide with its neighbor.
    <div className="min-w-0">
      <div className="truncate font-game text-lg text-accent">{value}</div>
      <div className="text-xs text-ink-soft">{label}</div>
    </div>
  );
}

function ArchiveRow<Day extends ArchiveDayBase, Stats>({
  config,
  dateKey,
  day,
}: {
  config: GameArchiveConfig<Day, Stats>;
  dateKey: string;
  day: Day;
}) {
  const { text, done } = config.rowStatus(dateKey, day);
  return (
    <Link
      to={`/games/${config.gameId}/archive/${dateKey}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-raised px-5 py-4 transition-transform active:scale-[0.98]"
    >
      <div className="min-w-0">
        <div className="font-semibold">{formatDateKey(dateKey)}</div>
        <div
          className={`mt-0.5 truncate text-sm font-medium ${
            done ? "text-accent" : "text-ink"
          }`}
        >
          {text}
        </div>
      </div>
      {done ? (
        <span className="shrink-0 font-game text-base text-accent">
          {formatDuration(day.elapsedMs)}
        </span>
      ) : (
        <span className="shrink-0 text-ink-soft" aria-hidden>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </Link>
  );
}
