import "@fontsource/rubik-mono-one/latin-400.css";
import { useCallback, useEffect, useState } from "react";
import { CircleHelp, Undo2, Trash2 } from "lucide-react";
import { HomeLink } from "../../../components/HomeLink";
import { GameToast, useToast } from "../../../components/game/GameToast";
import { formatDateKey } from "../../../lib/date";
import {
  useSerpentineGame,
  type GameMode,
} from "../state/useSerpentineGame";
import { loadCoachSeen, markCoachSeen } from "../state/persistence";
import { SnakeGrid } from "./SnakeGrid";
import { SolvedOverlay, SerpentineCoach } from "./Overlays";
import type { Difficulty } from "../engine/types";

const DIFF_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

interface Props {
  mode: GameMode;
  difficulty?: Difficulty;
  onDifficultyChange?: (d: Difficulty) => void;
}

export function GameScreen({ mode, difficulty, onDifficultyChange }: Props) {
  const { state, dispatch, puzzle, solvedElapsedMs } =
    useSerpentineGame(mode);

  const [resultsOpen, setResultsOpen] = useState(true);
  const [coachOpen, setCoachOpen] = useState(false);
  const { toast, show } = useToast();

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
          <span className="text-sm font-semibold text-ink-soft">
            {formatDateKey(mode.dateKey)}
          </span>
        ) : (
          <HomeLink />
        )}
        <span className="flex items-center gap-3">
          {state.solved && !resultsOpen && (
            <button
              type="button"
              onClick={() => setResultsOpen(true)}
              className="text-sm font-semibold text-accent"
            >
              Results
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
        <span className="text-sm font-medium text-accent italic">
          {puzzle.title}
        </span>
      </div>

      {/* Difficulty pills */}
      {difficulty !== undefined && onDifficultyChange && (
        <div className="flex gap-1 pb-3">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
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

      {/* Grid */}
      <div className="relative flex flex-1 flex-col justify-center py-2">
        <SnakeGrid
          rows={puzzle.rows}
          cols={puzzle.cols}
          grid={puzzle.grid}
          targetLen={puzzle.path.length}
          cells={state.cells}
          solved={state.solved}
          onTapCell={onTapCell}
        />
        <GameToast toast={toast} />
      </div>

      {/* Progress */}
      {!state.solved && (
        <div className="pb-3 text-center text-sm font-medium text-ink-soft">
          {state.cells.length} / {puzzle.path.length} letters
        </div>
      )}

      {/* Controls */}
      {!state.solved && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => dispatch({ type: "undo" })}
            aria-label="undo"
            className="relative flex h-10 w-12 touch-manipulation items-center justify-center rounded-lg bg-tile text-ink after:absolute after:-inset-1.5 after:content-[''] active:scale-90"
          >
            <Undo2 aria-hidden className="h-4 w-4" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => dispatch({ type: "clearSnake" })}
            aria-label="clear snake"
            className="relative flex h-10 w-12 touch-manipulation items-center justify-center rounded-lg bg-tile text-ink after:absolute after:-inset-1.5 after:content-[''] active:scale-90"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Solved overlay */}
      {state.solved && (
        <SolvedOverlay
          puzzle={puzzle}
          difficulty={mode.difficulty}
          dateKey={mode.dateKey}
          elapsedMs={solvedElapsedMs}
          open={resultsOpen}
          onClose={() => setResultsOpen(false)}
        />
      )}

      {/* Coach */}
      <SerpentineCoach open={coachOpen} onClose={closeCoach} />

      {/* Accessibility */}
      <div aria-live="polite" role="status" className="sr-only">
        {toast && <span key={toast.nonce}>{toast.text}</span>}
      </div>
    </div>
  );
}
