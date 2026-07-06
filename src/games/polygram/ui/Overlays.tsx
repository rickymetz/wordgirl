import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { rankFor } from "../engine/scoring";
import type { GameState } from "../state/reducer";
import { POLYGON_NAMES } from "./polygonPath";

/** Brief celebration between levels; auto-advances into the morph. */
export function LevelClearOverlay({
  state,
  onAdvance,
}: {
  state: GameState;
  onAdvance: () => void;
}) {
  const clearing = state.phase === "levelClear";
  const nextSize = state.puzzle.levels[state.levelIndex + 1]?.size;

  useEffect(() => {
    if (!clearing) return;
    const timer = setTimeout(onAdvance, 1500);
    return () => clearTimeout(timer);
  }, [clearing, onAdvance]);

  return (
    <AnimatePresence>
      {clearing && nextSize && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="rounded-3xl bg-accent px-8 py-6 text-center text-surface shadow-xl"
            initial={{ scale: 0.7, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="text-sm font-semibold tracking-widest uppercase opacity-80">
              Level clear
            </div>
            <div className="mt-1 text-3xl font-bold">
              {POLYGON_NAMES[nextSize]} time!
            </div>
            <div className="mt-1 text-sm opacity-80">
              A new letter joins the flock
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** End-of-puzzle screen. */
export function DoneOverlay({
  state,
  mode,
  onNewPuzzle,
}: {
  state: GameState;
  mode: "daily" | "practice" | "archive";
  onNewPuzzle?: () => void;
}) {
  if (state.phase !== "done") return null;
  const rank = rankFor(state.score, state.puzzle);
  const hintUsed = Object.keys(state.revealed).length > 0;

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
        {hintUsed && (
          <div className="mt-2">
            <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft">
              Used hint
            </span>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
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
              className="rounded-full bg-accent py-3 font-semibold text-surface active:scale-95"
            >
              Keep playing — practice
            </Link>
          )}
          {mode === "archive" && (
            <Link
              to="/games/polygram/archive"
              className="rounded-full bg-accent py-3 font-semibold text-surface active:scale-95"
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
