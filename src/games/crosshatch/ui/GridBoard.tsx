import { useEffect, useSyncExternalStore } from "react";
import { motion, useAnimationControls } from "motion/react";
import { cellKey, slotCells } from "../engine/types";
import {
  cursorSlot,
  letterAt,
  slotsAt,
  type GameState,
} from "../state/reducer";

const GAP = 6;
const MAX_CELL = 60;
const MIN_CELL = 34;
/** Rough height of everything that isn't the grid (header, bars,
 * chips, keyboard) — the grid must fit in what's left so the keyboard
 * never falls below the fold on short phones. */
const CHROME_H = 480;

/** Live viewport size — re-measures on resize/orientation change.
 * Height is what pages can actually use: innerHeight minus #root's
 * safe-area padding, which is real (~93px) in installed/PWA mode. */
function useViewport(): { vw: number; vh: number } {
  const snapshot = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("resize", onChange);
      window.addEventListener("orientationchange", onChange);
      return () => {
        window.removeEventListener("resize", onChange);
        window.removeEventListener("orientationchange", onChange);
      };
    },
    () => {
      const root = document.getElementById("root");
      const style = root && getComputedStyle(root);
      const insets = style
        ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
        : 0;
      return `${window.innerWidth}x${window.innerHeight - insets}`;
    },
  );
  const [vw, vh] = snapshot.split("x").map(Number);
  return { vw, vh };
}

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
  const { vw, vh } = useViewport();
  const wCell =
    (Math.min(340, vw - 40) - (puzzle.cols - 1) * GAP) / puzzle.cols;
  const hCell = (vh - CHROME_H - (puzzle.rows - 1) * GAP) / puzzle.rows;
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, wCell, hCell));

  const active = cursorSlot(state);
  const activeKeys = new Set(
    active ? slotCells(active).map((c) => cellKey(c.row, c.col)) : [],
  );

  // A submit outcome nudges the whole grid: shake on a miss, a soft
  // pulse on a combo. Animation controls, not a keyed remount — the
  // buttons keep their identity across submits.
  const controls = useAnimationControls();
  const r = state.lastResult;
  useEffect(() => {
    if (!r) return;
    void controls.start(
      r.type === "correct"
        ? { scale: [1, 1.02, 1], transition: { duration: 0.35 } }
        : { x: [0, -7, 7, -4, 4, 0], transition: { duration: 0.35 } },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.nonce]);

  return (
    <motion.div
      animate={controls}
      role="group"
      aria-label="puzzle grid"
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
            // Pointer taps mustn't steal focus — physical Enter should
            // keep submitting. Tab focus + native activation still work.
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onFocus(row, col)}
            aria-label={`row ${row + 1}, column ${col + 1} — ${
              given
                ? `locked letter ${given.toUpperCase()}`
                : letter
                  ? `letter ${letter.toUpperCase()}, tap to edit`
                  : "empty"
            }`}
            className={`relative flex items-center justify-center rounded-lg font-game uppercase transition-colors ${
              given
                ? "bg-ink text-surface"
                : inActiveSlot
                  ? "bg-accent-soft text-ink"
                  : "bg-tile text-ink"
            } ${isCursor ? "ring-2 ring-accent" : ""}`}
            style={{ fontSize: Math.round(cell * 0.42) }}
          >
            {letter?.toUpperCase() ?? ""}
            {given && (
              // Quiet corner padlock — the tile is locked, not typed.
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="absolute top-1 right-1 opacity-40"
                style={{ width: Math.max(8, Math.round(cell * 0.17)) }}
              >
                <rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" stroke="none" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            )}
          </button>
        );
      })}
    </motion.div>
  );
}
