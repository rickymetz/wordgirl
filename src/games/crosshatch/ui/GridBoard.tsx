import { motion } from "motion/react";
import { cellKey, slotCells } from "../engine/types";
import {
  cursorSlot,
  letterAt,
  slotsAt,
  type GameState,
} from "../state/reducer";

const GAP = 6;
const MAX_CELL = 60;

/**
 * The crossword grid. Cells are buttons (tap to focus; re-tap a
 * crossing to switch direction); locked givens render inverted.
 */
export function GridBoard({
  state,
  onFocus,
}: {
  state: GameState;
  onFocus: (row: number, col: number) => void;
}) {
  const { puzzle } = state;
  const boardW = Math.min(340, window.innerWidth - 40);
  const cell = Math.min(
    MAX_CELL,
    (boardW - (puzzle.cols - 1) * GAP) / puzzle.cols,
  );

  const active = cursorSlot(state);
  const activeKeys = new Set(
    active ? slotCells(active).map((c) => cellKey(c.row, c.col)) : [],
  );

  // A submit outcome nudges the whole grid: shake on a miss, a soft
  // pulse on a combo. Keyed by nonce so repeats re-trigger.
  const r = state.lastResult;
  const animate =
    r === null
      ? {}
      : r.type === "correct"
        ? { scale: [1, 1.02, 1] }
        : { x: [0, -7, 7, -4, 4, 0] };

  return (
    <motion.div
      key={r?.nonce ?? 0}
      animate={animate}
      transition={{ duration: 0.35 }}
      className="grid touch-manipulation select-none"
      style={{
        gridTemplateColumns: `repeat(${puzzle.cols}, ${cell}px)`,
        gridTemplateRows: `repeat(${puzzle.rows}, ${cell}px)`,
        gap: GAP,
      }}
    >
      {Array.from({ length: puzzle.rows * puzzle.cols }, (_, i) => {
        const row = Math.floor(i / puzzle.cols);
        const col = i % puzzle.cols;
        if (slotsAt(puzzle, row, col).length === 0) {
          return <div key={i} aria-hidden />;
        }
        const key = cellKey(row, col);
        const given = puzzle.givens[key];
        const letter = letterAt(state, row, col);
        const isCursor =
          state.cursor?.row === row && state.cursor?.col === col;
        const inActiveSlot = activeKeys.has(key);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onFocus(row, col)}
            aria-label={
              given
                ? `locked letter ${given.toUpperCase()}`
                : letter
                  ? `letter ${letter.toUpperCase()} — tap to edit`
                  : "empty cell"
            }
            className={`flex items-center justify-center rounded-lg font-game uppercase transition-colors ${
              given
                ? "bg-ink text-surface"
                : inActiveSlot
                  ? "bg-accent-soft text-ink"
                  : "bg-tile text-ink"
            } ${isCursor ? "ring-2 ring-accent" : ""}`}
            style={{ fontSize: Math.round(cell * 0.42) }}
          >
            {letter?.toUpperCase() ?? ""}
          </button>
        );
      })}
    </motion.div>
  );
}
