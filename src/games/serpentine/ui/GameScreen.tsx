import "@fontsource/rubik-mono-one/latin-400.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CircleHelp, Undo2, Trash2, Lightbulb } from "lucide-react";
import { HomeLink } from "../../../components/HomeLink";
import { ShareButton } from "../../../components/ShareButton";
import { ConfettiOverlay } from "../../../components/ConfettiOverlay";
import { useSolveTransition } from "../../../lib/useSolveTransition";
import { useStorageBroken } from "../../../lib/useStorageBroken";
import { GameToast, useToast } from "../../../components/game/GameToast";
import { formatDateKey, formatDuration, formatShareDate, localDateKey } from "../../../lib/date";
import { SHARE_URL } from "../../../lib/share";
import {
  useSerpentineGame,
  type GameMode,
} from "../state/useSerpentineGame";
import { loadCoachSeen, loadDailyProgress, markCoachSeen } from "../state/persistence";
import { SnakeGrid } from "./SnakeGrid";
import { SnakeText } from "./SnakeText";
import { SerpentineCoach } from "./Overlays";
import { cellKey, type Difficulty } from "../engine/types";
import { nextHintIndex, replayHints, wordStartIndices } from "../engine/hints";

function buildShareText(
  puzzle: { path: { row: number; col: number }[]; text: string },
  difficulty: Difficulty,
  dateKey: string | undefined,
  elapsedMs: number | null,
  hints: number,
): string {
  const title = `Serpentine${dateKey ? ` — ${formatShareDate(dateKey)}` : ""}`;
  const label = difficulty === "haiku" ? "Haiku" : "Poem";
  const time = elapsedMs !== null ? ` in ${formatDuration(elapsedMs)}` : "";
  const hintPart = hints > 0 ? ` · 🫣 ${hints}` : " · 🤓";
  return `${title}\n${label}: ${puzzle.path.length} letters${time}${hintPart} 🐍\n\n${SHARE_URL}`;
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
  const { state, dispatch, puzzle, solvedElapsedMs, hydratedAsSolved, hydratedHints, setHints } =
    useSerpentineGame(mode);

  const storageBroken = useStorageBroken();
  const { showConfetti, showResults } = useSolveTransition(state.solved, hydratedAsSolved);

  const [coachOpen, setCoachOpen] = useState(false);
  const [hintedSet, setHintedSet] = useState<Set<number>>(new Set());
  const hintedRef = useRef(hintedSet);
  const hintCount = hintedSet.size;

  const { toast, show } = useToast();

  const wordStarts = useMemo(() => wordStartIndices(puzzle.text), [puzzle]);

  // Restore the hinted set from the saved count, ONCE. hydratedHints
  // reads a ref that taking a hint also writes, so re-running this
  // would overwrite the cell just revealed with a replay from the
  // phrase start — every hint landing behind the snake, invisible.
  const hintsRestored = useRef(false);
  useEffect(() => {
    if (hintsRestored.current || hydratedHints <= 0) return;
    hintsRestored.current = true;
    const set = replayHints(
      wordStarts,
      puzzle.path.length,
      state.cells.length,
      hydratedHints,
    );
    hintedRef.current = set;
    setHintedSet(set);
  }, [hydratedHints, wordStarts, puzzle.path.length, state.cells.length]);

  const { hintIndices, hintCellKeys } = useMemo(() => {
    if (hintedSet.size === 0) return { hintIndices: undefined, hintCellKeys: undefined };
    const keys = new Set<string>();
    for (const idx of hintedSet) {
      keys.add(cellKey(puzzle.path[idx]));
    }
    return { hintIndices: hintedSet, hintCellKeys: keys };
  }, [hintedSet, puzzle]);

  const canHint = useMemo(() => {
    for (let i = state.cells.length; i < puzzle.path.length; i++) {
      if (!hintedSet.has(i)) return true;
    }
    return false;
  }, [state.cells.length, puzzle.path.length, hintedSet]);

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

  // Practice: offer a jump to the daily only while it's still unsolved.
  const [dailySolved, setDailySolved] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode.kind !== "practice") return;
    const today = localDateKey();
    void loadDailyProgress(mode.difficulty, today).then((saved) =>
      setDailySolved(saved?.solved ?? false),
    );
  }, [mode.kind, mode.difficulty]);

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
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-6 md:max-w-2xl [@media(max-height:720px)]:pb-3"
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
        <span className="flex items-center gap-2">
          {mode.kind === "practice" && dailySolved === false && (
            <Link
              to="/games/serpentine"
              className="text-sm font-semibold text-accent"
            >
              New daily puzzle
            </Link>
          )}
          {!state.solved && (
            <button
              className="relative flex items-center gap-1 px-2.5 py-1 rounded-full
                         text-ink-soft text-xs font-semibold
                         active:scale-95 touch-manipulation select-none
                         after:absolute after:inset-x-0 after:-inset-y-2.5"
              disabled={!canHint}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                // The set is now player-driven; block any late restore.
                hintsRestored.current = true;
                const current = hintedRef.current;
                const idx = nextHintIndex(
                  wordStarts,
                  puzzle.path.length,
                  state.cells.length,
                  current,
                );
                if (idx === null) return;
                const next = new Set(current);
                next.add(idx);
                hintedRef.current = next;
                setHintedSet(next);
                setHints(next.size);
              }}
            >
              <Lightbulb aria-hidden className="h-3.5 w-3.5" />
              Hint{hintCount > 0 ? ` (${hintCount})` : ""}
            </button>
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
        <div className="pb-1 text-center text-sm font-medium text-accent">
          <span className="italic">&ldquo;{puzzle.title}&rdquo;</span>
          <br />
          <span className="text-xs text-ink-soft">by <em>{puzzle.author}</em></span>
        </div>
        <SnakeText puzzle={puzzle} cells={state.cells} hintIndices={hintIndices} />
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
          hintCells={hintCellKeys}
          onTapCell={onTapCell}
          onUndo={() => dispatch({ type: "undo" })}
          onClear={() => dispatch({ type: "clearSnake" })}
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
                text={buildShareText(puzzle, mode.difficulty, mode.dateKey, solvedElapsedMs, hintCount)}
                gameId="serpentine"
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
