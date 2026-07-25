import { Fragment } from "react";
import { motion } from "motion/react";
import { phraseWords } from "../engine/phrase";
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

export function SnakeText({ puzzle, cells, hintIndices }: Props) {
  const total = puzzle.path.length;
  const size = fontSize(total);
  const words = phraseWords(puzzle.text);

  return (
    <div
      role="status"
      className="relative flex min-h-12 items-center justify-center py-1"
      aria-label={`${cells.length} of ${total} letters placed`}
    >
      <span className={`flex flex-wrap justify-center gap-x-2 font-game ${size} font-normal uppercase`}>
        {words.map((word) => (
          <span key={word.start} className="inline-flex whitespace-nowrap">
            {word.segments.map(([start, end], segment) => (
              <Fragment key={start}>
                {segment > 0 && (
                  <span
                    className={`inline-block ${
                      start <= cells.length ? "text-accent" : "text-ink-soft/70"
                    }`}
                  >
                    -
                  </span>
                )}
                {Array.from({ length: end - start }, (_, j) => {
                  const i = start + j;
                  const letter =
                    i < cells.length
                      ? puzzle.grid[cells[i].row][cells[i].col]
                      : null;
                  const isHint = !letter && hintIndices?.has(i);
                  const hintLetter = isHint
                    ? puzzle.grid[puzzle.path[i].row][puzzle.path[i].col]
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
                  ) : hintLetter ? (
                    <span key={`${i}-hint`} className="inline-block text-accent/50">
                      {hintLetter}
                    </span>
                  ) : (
                    <span key={`${i}-blank`} className="inline-block text-ink-soft/70">
                      ?
                    </span>
                  );
                })}
              </Fragment>
            ))}
          </span>
        ))}
      </span>
    </div>
  );
}
