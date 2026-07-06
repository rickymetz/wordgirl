import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { formatDateKey, formatDuration } from "../../../lib/date";
import { rankFor } from "../engine/scoring";
import { loadDailyProgress } from "../state/persistence";
import type { GameState } from "../state/reducer";
import { POLYGON_NAMES } from "./polygonPath";

function buildShareText(
  state: GameState,
  dateKey: string,
  elapsedMs: number,
): string {
  const hints = Object.values(state.revealed).reduce(
    (n, positions) => n + positions.length,
    0,
  );
  const hintPart = hints > 0 ? ` · 🫣 ${hints}` : "";
  return [
    `${window.location.host} — ${formatDateKey(dateKey)}`,
    `Score ${state.score}/${state.puzzle.maxScore} · ⏱️ ${formatDuration(elapsedMs)}${hintPart}`,
  ].join("\n");
}

/** End-of-puzzle screen. */
export function DoneOverlay({
  state,
  mode,
  dateKey,
  onNewPuzzle,
  onReplay,
}: {
  state: GameState;
  mode: "daily" | "practice" | "archive";
  /** Set for daily/archive — enables the share button. */
  dateKey?: string;
  onNewPuzzle?: () => void;
  onReplay?: () => void;
}) {
  const done = state.phase === "done";
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // The persisted save holds the frozen completion time.
  useEffect(() => {
    if (!done || !dateKey) return;
    void loadDailyProgress(dateKey).then((saved) =>
      setElapsedMs(saved?.elapsedMs ?? 0),
    );
  }, [done, dateKey]);

  if (!done) return null;
  const rank = rankFor(state.score, state.puzzle);
  const hintUsed = Object.keys(state.revealed).length > 0;

  const share = async () => {
    if (!dateKey || elapsedMs === null) return;
    const text = buildShareText(state, dateKey, elapsedMs);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      throw new Error("no web share");
    } catch {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-center justify-center bg-surface/90 px-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-3xl border border-line bg-surface-raised p-8 text-center shadow-xl"
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <div className="text-sm font-semibold tracking-widest text-ink-soft uppercase">
          {mode === "daily" ? "Daily complete" : "Puzzle complete"}
        </div>
        <div className="mt-2 text-4xl font-bold text-accent">{rank}</div>
        <div className="mt-1 text-ink-soft">
          {state.score} of {state.puzzle.maxScore} points ·{" "}
          {POLYGON_NAMES[state.puzzle.maxLevel]} reached
        </div>
        {elapsedMs !== null && (
          <div className="mt-1 font-game text-lg text-accent">
            {formatDuration(elapsedMs)}
          </div>
        )}
        {hintUsed && (
          <div className="mt-2">
            <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft">
              Used hint
            </span>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          {dateKey && (
            <button
              type="button"
              onClick={share}
              className="rounded-full bg-accent py-3 font-semibold text-surface active:scale-95"
            >
              {copied ? "Copied!" : "Share"}
            </button>
          )}
          {mode === "practice" && onNewPuzzle && (
            <button
              type="button"
              onClick={onNewPuzzle}
              className="rounded-full bg-accent py-3 font-semibold text-surface active:scale-95"
            >
              New puzzle
            </button>
          )}
          {mode === "daily" && (
            <Link
              to="/games/polygram/practice"
              className="rounded-full border border-line py-3 font-semibold active:scale-95"
            >
              Keep playing — practice
            </Link>
          )}
          {mode === "archive" && onReplay && (
            <button
              type="button"
              onClick={onReplay}
              className="rounded-full border border-line py-3 font-semibold active:scale-95"
            >
              Replay puzzle
            </button>
          )}
          {mode === "archive" && (
            <Link
              to="/games/polygram/archive"
              className="rounded-full border border-line py-3 font-semibold active:scale-95"
            >
              More past puzzles
            </Link>
          )}
          <Link
            to="/"
            className="rounded-full border border-line py-3 font-semibold active:scale-95"
          >
            Back to WordGirl
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
