import "@fontsource/rubik-mono-one/latin-400.css";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, RotateCcw } from "lucide-react";
import { formatDuration } from "../../../lib/date";
import { HomeLink } from "../../../components/HomeLink";
import { ModalDialog } from "../../../components/ModalDialog";
import { useTilewordGame, type GameMode } from "../state/useTilewordGame";
import { dominoAt, placedDominoIds } from "../state/reducer";
import type { Cell, Difficulty } from "../engine/types";
import { Board } from "./Board";
import { DominoTray } from "./DominoTray";

const DIFF_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

interface Props {
  mode: GameMode;
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
}

export function GameScreen({ mode, difficulty, onDifficultyChange }: Props) {
  const { state, dispatch, puzzle, dict, solvedElapsedMs } =
    useTilewordGame(mode);

  const [resultsOpen, setResultsOpen] = useState(true);
  const placed = placedDominoIds(state);
  const totalDominoes = puzzle.dominoes.length;
  const placedCount = placed.size;

  const handleCellTap = (cell: Cell) => {
    if (state.solved) return;

    const pd = dominoAt(state, cell.row, cell.col);
    if (pd) {
      dispatch({ type: "removeDomino", dominoId: pd.dominoId });
      return;
    }

    if (state.selectedDominoId !== null) {
      dispatch({ type: "placeDomino", cell, dict });
    }
  };

  return (
    <div
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-6 [@media(max-height:720px)]:pb-3"
      data-level="tileword"
    >
      {/* Header */}
      <header className="flex items-center justify-between pt-6 pb-2 [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-1">
        <HomeLink />
        <div className="w-6" />
      </header>

      {/* Title + difficulty */}
      <div className="flex items-baseline gap-2.5 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Tileword</h1>
        <span className="text-base font-semibold text-ink-soft">
          {placedCount}/{totalDominoes} placed
        </span>
      </div>

      {/* Difficulty tabs */}
      <div className="flex gap-1 pb-3">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <button
            key={d}
            className={[
              "px-4 py-1.5 rounded-full text-sm font-semibold",
              "touch-manipulation select-none transition-colors",
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

      {/* Board — centered in remaining space */}
      <div className="flex flex-1 flex-col items-center justify-center py-4 [@media(max-height:720px)]:py-2">
        <Board
          state={state}
          onCellTap={handleCellTap}
        />
      </div>

      {/* Tray — pinned to bottom */}
      <div className="flex flex-col items-center gap-2">
        {placedCount > 0 && !state.solved && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-surface-tint text-ink-soft text-sm font-semibold
                       active:scale-95 touch-manipulation select-none"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => dispatch({ type: "clearBoard" })}
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        )}
        <DominoTray
          state={state}
          onSelect={(id) => dispatch({ type: "selectDomino", dominoId: id })}
          onRotate={() => dispatch({ type: "rotateDomino" })}
        />
      </div>

      {/* Solved overlay */}
      <AnimatePresence>
        {state.solved && resultsOpen && (
          <ModalDialog
            labelledBy="tileword-result"
            onClose={() => setResultsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center gap-4 p-6"
              data-autofocus
              tabIndex={-1}
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-good/20">
                <Check className="h-8 w-8 text-good" />
              </div>
              <h2
                id="tileword-result"
                className="text-xl font-bold text-ink"
              >
                Solved
              </h2>
              {solvedElapsedMs !== null && (
                <p className="text-ink-soft text-sm">
                  {formatDuration(solvedElapsedMs)}
                </p>
              )}
              <button
                className="px-6 py-2 rounded-full bg-accent text-surface
                           font-semibold touch-manipulation select-none
                           active:scale-95"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setResultsOpen(false)}
              >
                Done
              </button>
            </motion.div>
          </ModalDialog>
        )}
      </AnimatePresence>
    </div>
  );
}
