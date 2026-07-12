import "@fontsource/rubik-mono-one/latin-400.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CircleHelp, Undo2, Trash2, Lightbulb } from "lucide-react";
import { HomeLink } from "../../../components/HomeLink";
import { ShareButton } from "../../../components/ShareButton";
import { ConfettiOverlay } from "../../../components/ConfettiOverlay";
import { useSolveTransition } from "../../../lib/useSolveTransition";
import { useStorageBroken } from "../../../lib/useStorageBroken";
import { GameToast, useToast } from "../../../components/game/GameToast";
import { formatDateKey, formatDuration, formatShareDate } from "../../../lib/date";
import { SHARE_URL } from "../../../lib/share";
import {
  useSerpentineGame,
  type GameMode,
} from "../state/useSerpentineGame";
import { loadCoachSeen, markCoachSeen } from "../state/persistence";
import { SnakeGrid } from "./SnakeGrid";
import { SnakeText } from "./SnakeText";
import { SerpentineCoach } from "./Overlays";
import { cellKey, type Difficulty } from "../engine/types";

function buildShareText(
  puzzle: { path: { row: number; col: number }[]; text: string },
  difficulty: Difficulty,
  dateKey: string | undefined,
  elapsedMs: number | null,
): string {
  const title = `Serpentine${dateKey ? ` — ${formatShareDate(dateKey)}` : ""}`;
  const label = difficulty === "haiku" ? "Haiku" : "Poem";
  const time = elapsedMs !== null ? ` in ${formatDuration(elapsedMs)}` : "";
  return `${title}\n${label}: ${puzzle.path.length} letters${time} 🐍\n\n${SHARE_URL}`;
}

const DIFF_LABELS: Record<Difficulty, string> = {
  haiku: "Haiku",
  poem: "Poem",
};

interface Props {
  mode: GameMode;
  difficulty?: Difficulty;
  onDifficultyChange?: (d: Difficulty) => void;
  onNewPuzzle?: () => void;
  onReplay?: () => Promise<void>;
}

export function GameScreen({ mode, difficulty, onDifficultyChange }: Props) {
  const { state, dispatch, puzzle, solvedElapsedMs } =
    useSerpentineGame(mode);

  const storageBroken = useStorageBroken();
  const { showConfetti, showResults } = useSolveTransition(state.solved);

  const [coachOpen, setCoachOpen] = useState(false);
  const [hintActive, setHintActive] = useState(false);
  const { toast, show } = useToast();

  const { hintIndices, hintCellKeys } = useMemo(() => {
    const indices = new Set<number>();
    const keys = new Set<string>();
    let pi = 0;
    let atWordStart = true;
    for (const ch of puzzle.text) {
      if (ch === " ") {
        atWordStart = true;
        continue;
      }
      if (!/[A-Za-z]/.test(ch)) continue;
      if (atWordStart) {
        indices.add(pi);
        keys.add(cellKey(puzzle.path[pi]));
        atWordStart = false;
      }
      pi++;
    }
    return { hintIndices: indices, hintCellKeys: keys };
  }, [puzzle]);

  // First-run coach.
  useEffect(() => {
    void loadCoachSeen().then((seen) => {
      if (!seen) setCoachOpen(true);
    });
  }, []);
  const closeCoach = () => {
    setCoachOpen(false);
    void markCoachSeen();
  };

  // Show toast on solve.
  useEffect(() => {
    if (state.solved) show("Solved!", 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.solved]);

  const onTapCell = useCallback(
    (row: number, col: number) => dispatch({ type: "tapCell", row, col }),
    [dispatch],
  );

  return (
    <div
      data-level="serpentine"
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-6 [@media(max-height:720px)]:pb-3"
    >
      {/* Header */}
      <header className="flex items-center justify-between pt-6 pb-2 [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-1">
        {mode.kind === "archive" ? (
          <Link
            to="/games/serpentine/archive"
            className="text-sm font-semibold text-ink-soft"
          >
            ← Archive
          </Link>
        ) : (
          <HomeLink />
        )}
        <span className="flex items-center gap-3">
          {mode.kind === "practice" && !state.solved && (
            <Link
              to="/games/serpentine"
              className="text-sm font-semibold text-accent"
            >
              New daily puzzle
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCoachOpen(true)}
            aria-label="how to play"
            className="-m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90"
          >
            <CircleHelp aria-hidden className="h-5 w-5" />
          </button>
        </span>
      </header>

      {/* Title + status */}
      <div className="flex items-baseline gap-2.5 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Serpentine</h1>
        <svg role="img" aria-label="serpentine" width="20" height="20" viewBox="0 0 20 20"
          className="shrink-0 self-center text-accent">
          <path d="M5 3c0 2 5 3 5 5s-5 3-5 5 5 3 5 5" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        {mode.kind === "practice" ? (
          <span className="text-base font-semibold text-ink-soft">
            practice
          </span>
        ) : mode.kind === "archive" ? (
          <span className="text-base font-semibold text-ink-soft">
            {formatDateKey(mode.dateKey)}
          </span>
        ) : null}
      </div>

      {/* Difficulty pills */}
      {difficulty !== undefined && onDifficultyChange && (
        <div className="flex gap-1 pb-3" role="group" aria-label="Difficulty">
          {(["haiku", "poem"] as Difficulty[]).map((d) => (
            <button
              key={d}
              aria-pressed={d === difficulty}
              className={[
                "relative px-4 py-1.5 rounded-full text-sm font-semibold",
                "touch-manipulation select-none transition-colors",
                "after:absolute after:inset-x-0 after:-inset-y-1.5",
                d === difficulty
                  ? "bg-accent text-surface"
                  : "bg-surface-tint text-ink-soft",
              ].join(" ")}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onDifficultyChange(d)}
            >
              {DIFF_LABELS[d]}
            </button>
          ))}
        </div>
      )}

      {storageBroken && (
        <p className="pb-2 text-xs font-semibold text-warn" role="alert">
          Progress can't be saved on this device.
        </p>
      )}

      {/* Puzzle title + typed-out letters */}
      <div className="px-1 pt-10 pb-5">
        <div className="pb-1 text-center text-sm font-medium text-accent italic">
          {puzzle.title}
        </div>
        <SnakeText puzzle={puzzle} cells={state.cells} hintIndices={hintActive ? hintIndices : undefined} />
      </div>

      {/* Grid */}
      <div className="relative flex flex-1 flex-col justify-center py-2">
        <SnakeGrid
          rows={puzzle.rows}
          cols={puzzle.cols}
          grid={puzzle.grid}
          cells={state.cells}
          claimed={state.claimed}
          solved={state.solved}
          blocked={puzzle.blocked}
          hintCells={hintActive ? hintCellKeys : undefined}
          onTapCell={onTapCell}
        />
        <GameToast toast={toast} />
      </div>

      <AnimatePresence mode="wait">
        {state.solved && showResults ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 pb-2"
          >
            <p className="text-lg font-bold text-ink">Solved</p>
            {solvedElapsedMs !== null && (
              <p className="font-game text-2xl text-accent">
                {formatDuration(solvedElapsedMs)}
              </p>
            )}
            <p className="text-sm text-ink-soft">
              {puzzle.path.length} letters · {puzzle.rows}×{puzzle.cols} grid
            </p>
            {mode.kind !== "practice" && solvedElapsedMs !== null && (
              <ShareButton
                text={buildShareText(puzzle, mode.difficulty, mode.dateKey, solvedElapsedMs)}
              />
            )}
          </motion.div>
        ) : !state.solved ? (
          <motion.div
            key="controls"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="pb-3 text-center text-sm font-medium text-ink-soft">
              {state.cells.length} / {puzzle.path.length} letters
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => dispatch({ type: "undo" })}
                className="relative flex h-10 touch-manipulation items-center gap-1.5 rounded-lg bg-tile px-4 text-sm font-semibold text-ink after:absolute after:-inset-1.5 after:content-[''] active:scale-90"
              >
                <Undo2 aria-hidden className="h-4 w-4" />
                Undo
              </button>
              <button
                type="button"
                aria-pressed={hintActive}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setHintActive((h) => !h)}
                className={[
                  "relative flex h-10 touch-manipulation items-center gap-1.5 rounded-lg px-4 text-sm font-semibold after:absolute after:-inset-1.5 after:content-[''] active:scale-90",
                  hintActive ? "bg-accent text-surface" : "bg-tile text-ink",
                ].join(" ")}
              >
                <Lightbulb aria-hidden className="h-4 w-4" />
                Hint
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => dispatch({ type: "clearSnake" })}
                className="relative flex h-10 touch-manipulation items-center gap-1.5 rounded-lg bg-tile px-4 text-sm font-semibold text-ink after:absolute after:-inset-1.5 after:content-[''] active:scale-90"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
                Clear
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showConfetti && <ConfettiOverlay />}

      {/* Coach */}
      <SerpentineCoach open={coachOpen} onClose={closeCoach} />

      {/* Accessibility */}
      <div aria-live="polite" role="status" className="sr-only">
        {toast && <span key={toast.nonce}>{toast.text}</span>}
      </div>
    </div>
  );
}
