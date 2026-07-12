import { motion, AnimatePresence } from "motion/react";
import type { Cell, PuzzleDef } from "../engine/types";

interface Props {
  puzzle: PuzzleDef;
  cells: Cell[];
  hintIndices?: Set<number>;
}

function fontSize(total: number): string {
  if (total <= 16) return "text-2xl";
  if (total <= 24) return "text-xl";
  if (total <= 36) return "text-lg";
  if (total <= 48) return "text-base";
  return "text-sm";
}

function wordBreaks(text: string): Set<number> {
  const breaks = new Set<number>();
  let letterIndex = 0;
  for (const ch of text) {
    if (ch === " ") {
      breaks.add(letterIndex);
    } else {
      letterIndex++;
    }
  }
  return breaks;
}

export function SnakeText({ puzzle, cells, hintIndices }: Props) {
  const total = puzzle.path.length;
  const size = fontSize(total);
  const breaks = wordBreaks(puzzle.text);

  return (
    <div
      role="status"
      className="relative flex min-h-12 items-center justify-center py-1"
      aria-label={`${cells.length} of ${total} letters placed`}
    >
      <span className={`flex flex-wrap justify-center font-game ${size} font-normal uppercase`}>
        <AnimatePresence mode="popLayout">
          {Array.from({ length: total }, (_, i) => {
            const letter =
              i < cells.length
                ? puzzle.grid[cells[i].row][cells[i].col]
                : null;
            const isHint = !letter && hintIndices?.has(i);
            const hintLetter = isHint
              ? puzzle.grid[puzzle.path[i].row][puzzle.path[i].col]
              : null;
            const gap = breaks.has(i) ? <span key={`sp-${i}`} className="inline-block w-2" /> : null;
            const char = letter ? (
              <motion.span
                key={`${i}-${letter}`}
                className="inline-block text-accent"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
              >
                {letter}
              </motion.span>
            ) : hintLetter ? (
              <span key={`hint-${i}`} className="inline-block text-accent/50">
                {hintLetter}
              </span>
            ) : (
              <span key={`blank-${i}`} className="inline-block text-ink-soft/70">
                ?
              </span>
            );
            return gap ? [gap, char] : char;
          })}
        </AnimatePresence>
      </span>
    </div>
  );
}
