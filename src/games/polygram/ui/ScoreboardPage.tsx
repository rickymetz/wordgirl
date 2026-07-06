import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDateKey } from "../../../lib/date";
import { rankFor } from "../engine/scoring";
import { generatePuzzle, dailySeed } from "../engine/generator";
import { getDictionary } from "../state/usePolygramGame";
import {
  loadAllDailyProgress,
  type DailyProgress,
} from "../state/persistence";

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Completed dailies, newest first: date, rank, score, solve time. */
export default function ScoreboardPage() {
  const [rows, setRows] = useState<DailyProgress[] | null>(null);

  useEffect(() => {
    void loadAllDailyProgress().then((all) => {
      setRows(
        Object.values(all)
          .filter((p) => p.completed)
          .sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
      );
    });
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-12">
      <header className="flex items-center justify-between pt-6 pb-2">
        <Link to="/" className="text-sm font-semibold text-ink-soft">
          ← WordGirl
        </Link>
        <Link
          to="/games/polygram"
          className="text-sm font-semibold text-accent"
        >
          Today's puzzle
        </Link>
      </header>

      <div className="pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Scoreboard</h1>
      </div>

      <div className="flex flex-col gap-3">
        {rows && rows.length === 0 && (
          <p className="text-ink-soft">
            No completed dailies yet — finish one and it shows up here.
          </p>
        )}
        {rows?.map((row) => {
          const rank = rankFor(
            row.score,
            generatePuzzle(getDictionary(), dailySeed(row.dateKey)),
          );
          const hintUsed = Object.keys(row.revealed).length > 0;
          return (
            <div
              key={row.dateKey}
              className="flex items-center justify-between rounded-2xl border border-line bg-surface-raised px-5 py-4"
            >
              <div>
                <div className="font-semibold">
                  {formatDateKey(row.dateKey)}
                </div>
                <div className="mt-0.5 text-sm text-ink-soft">
                  {rank} · {row.score} pts
                  {hintUsed && (
                    <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs font-semibold">
                      used hint
                    </span>
                  )}
                </div>
              </div>
              <div className="font-game text-lg text-accent">
                {formatDuration(row.elapsedMs ?? 0)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
