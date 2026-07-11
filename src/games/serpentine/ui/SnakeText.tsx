import { motion, AnimatePresence } from "motion/react";
import type { Cell, PuzzleDef } from "../engine/types";

interface Props {
  puzzle: PuzzleDef;
  cells: Cell[];
  solved: boolean;
}

function fontSize(total: number): string {
  if (total <= 16) return "text-2xl";
  if (total <= 24) return "text-xl";
  if (total <= 36) return "text-lg";
  if (total <= 48) return "text-base";
  return "text-sm";
}

export function SnakeText({ puzzle, cells }: Props) {
  const total = puzzle.path.length;
  const size = fontSize(total);

  return (
    <div
      className="relative flex min-h-12 items-center justify-center"
      aria-label={`${cells.length} of ${total} letters placed`}
    >
      <span className={`flex flex-wrap justify-center font-game ${size} font-normal uppercase`}>
        <AnimatePresence mode="popLayout">
          {Array.from({ length: total }, (_, i) => {
            const letter =
              i < cells.length
                ? puzzle.grid[cells[i].row][cells[i].col]
                : null;
            return letter ? (
              <motion.span
                key={`${i}-${letter}`}
                className="inline-block text-accent"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
              >
                {letter}
              </motion.span>
            ) : (
              <span key={`blank-${i}`} className="inline-block text-ink-soft/40">
                ?
              </span>
            );
          })}
        </AnimatePresence>
      </span>
    </div>
  );
}
