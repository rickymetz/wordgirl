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
import { SnakeLabels } from "./SnakeLabels";
import { SolvedOverlay, SerpentineCoach } from "./Overlays";
import type { Difficulty } from "../engine/types";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

interface Props {
  mode: GameMode;
}

export function GameScreen({ mode }: Props) {
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

  // Show toast when a single snake matches.
  const matchedCount = state.paths.filter((p) => p.matchedSnake >= 0).length;
  const prevMatchedRef = { current: 0 };
  useEffect(() => {
    if (matchedCount > prevMatchedRef.current && !state.solved) {
      const matched = state.paths.find(
        (p) => p.matchedSnake >= 0 && p.matchedSnake === matchedCount - 1,
      );
      if (matched) {
        const snake = puzzle.snakes[matched.matchedSnake];
        if (snake) show(snake.text, 2000);
      }
    }
    prevMatchedRef.current = matchedCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedCount]);

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
        <HomeLink />
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

      {/* Title */}
      <div className="flex items-baseline gap-2.5 pb-1">
        <h1 className="text-2xl font-bold tracking-tight">Serpentine</h1>
        <span className="text-base font-semibold text-ink-soft">
          {DIFFICULTY_LABELS[mode.difficulty]}
        </span>
      </div>
      {mode.kind !== "archive" ? null : (
        <p className="pb-1 text-sm font-semibold text-ink-soft">
          {formatDateKey(mode.dateKey)}
        </p>
      )}

      {/* Puzzle title hint */}
      <p className="pb-3 text-sm font-medium text-accent italic">
        {puzzle.title}
      </p>

      {/* Grid */}
      <div className="relative flex flex-1 flex-col justify-center py-2">
        <SnakeGrid
          rows={puzzle.rows}
          cols={puzzle.cols}
          grid={puzzle.grid}
          paths={state.paths}
          activeSnake={state.activeSnake}
          solved={state.solved}
          onTapCell={onTapCell}
        />
        <GameToast toast={toast} />
      </div>

      {/* Snake labels */}
      <div className="pb-3">
        <SnakeLabels
          puzzle={puzzle}
          paths={state.paths}
          activeSnake={state.activeSnake}
          solved={state.solved}
          onSwitchSnake={(i) => dispatch({ type: "switchSnake", index: i })}
        />
      </div>

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
