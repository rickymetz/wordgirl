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
import type { Dictionary } from "../engine/dictionary";
import { rankFor } from "../engine/scoring";
import { generatePuzzle, dailySeed } from "../engine/generator";
import { loadDictionary } from "../state/dictionaryLoader";
import {
  ARCHIVE_EPOCH,
  loadAllDailyProgress,
  loadStats,
  type ArchivedDay,
  type PolygramStats,
} from "../state/persistence";

// score -> rank needs the day's puzzle; cache so each date generates
// at most once per session instead of on every list render.
const rankCache = new Map<string, string>();
function rankForDay(
  dict: Dictionary,
  dateKey: string,
  score: number,
): string {
  const key = `${dateKey}:${score}`;
  let rank = rankCache.get(key);
  if (!rank) {
    rank = rankFor(score, generatePuzzle(dict, dailySeed(dateKey)));
    rankCache.set(key, rank);
  }
  return rank;
}

/** Past daily puzzles, newest first, with play status. */
export default function ArchivePage() {
  const [progress, setProgress] = useState<Record<
    string,
    ArchivedDay
  > | null>(null);
  const [stats, setStats] = useState<PolygramStats | null>(null);

  useEffect(() => {
    void loadAllDailyProgress().then(setProgress);
    void loadStats().then(setStats);
  }, []);

  const yesterday = previousDateKey(localDateKey());
  const dates =
    yesterday >= ARCHIVE_EPOCH
      ? dateKeyRange(ARCHIVE_EPOCH, yesterday).reverse()
      : [];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-12">
      <header className="flex items-center justify-between pt-6 pb-2">
        <HomeLink />
        <Link
          to="/games/polygram"
          className="text-sm font-semibold text-accent"
        >
          Today's puzzle
        </Link>
      </header>

      <div className="pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Archive</h1>
      </div>

      {/* The stats were always tracked — now they're shown. */}
      {stats && stats.played > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3 rounded-2xl bg-surface-raised px-5 py-4">
          <Stat label="Streak" value={stats.currentStreak} />
          <Stat label="Best streak" value={stats.bestStreak} />
          <Stat label="Solved" value={stats.completed} />
          <Stat label="Played" value={stats.played} />
          <Stat label="Best rank" value={stats.bestRank ?? "—"} />
          <Stat label="Points" value={stats.totalScore} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {dates.length === 0 && (
          <p className="text-ink-soft">
            No past puzzles yet — come back tomorrow!
          </p>
        )}
        {progress &&
          dates.map((dateKey) => (
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
  const completed = saved?.completed ?? false;
  if (saved?.completed) {
    // A stale save was played against an older dictionary: its score is
    // real history but doesn't map onto the current puzzle's ranks.
    // `use` is conditional on purpose: the dictionary only loads (and
    // suspends) when a rank is actually displayed.
    const rank = saved.stale
      ? "Completed"
      : rankForDay(use(loadDictionary()), dateKey, saved.score);
    status = `${rank} · ${saved.score} pts${
      Object.keys(saved.revealed).length > 0 ? " · used hint" : ""
    }${saved.stale ? " · older words" : ""}`;
    statusClass = "text-accent";
  } else if (saved && saved.foundWords.length > 0) {
    status = `In progress · ${saved.score} pts`;
    statusClass = "text-ink";
  }

  return (
    <Link
      to={`/games/polygram/archive/${dateKey}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-raised px-5 py-4 transition-transform active:scale-[0.98]"
    >
      <div className="min-w-0">
        <div className="font-semibold">{formatDateKey(dateKey)}</div>
        <div className={`mt-0.5 truncate text-sm font-medium ${statusClass}`}>
          {status}
        </div>
      </div>
      {completed ? (
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
