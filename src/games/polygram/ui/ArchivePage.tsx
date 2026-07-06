import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HomeLink } from "../../../components/HomeLink";
import {
  dateKeyRange,
  formatDateKey,
  formatDuration,
  localDateKey,
  previousDateKey,
} from "../../../lib/date";
import { rankFor } from "../engine/scoring";
import { generatePuzzle, dailySeed } from "../engine/generator";
import { getDictionary } from "../state/usePolygramGame";
import {
  ARCHIVE_EPOCH,
  loadAllDailyProgress,
  type ArchivedDay,
} from "../state/persistence";

// score -> rank needs the day's puzzle; cache so each date generates
// at most once per session instead of on every list render.
const rankCache = new Map<string, string>();
function rankForDay(dateKey: string, score: number): string {
  const key = `${dateKey}:${score}`;
  let rank = rankCache.get(key);
  if (!rank) {
    rank = rankFor(score, generatePuzzle(getDictionary(), dailySeed(dateKey)));
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

  useEffect(() => {
    void loadAllDailyProgress().then(setProgress);
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
    const rank = saved.stale ? "Completed" : rankForDay(dateKey, saved.score);
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
