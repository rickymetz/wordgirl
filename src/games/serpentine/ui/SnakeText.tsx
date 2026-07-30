import { motion } from "motion/react";
import { phraseWords } from "../engine/phrase";
import type { Cell, PuzzleDef } from "../engine/types";

interface Props {
  puzzle: PuzzleDef;
  cells: Cell[];
  /**
   * Letters the player knows but has not traced: the given first letter
   * of every word, plus any cell they have spent a hint on. One
   * treatment for both — from here they are the same thing, a letter
   * whose place on the grid is still to be found.
   */
  revealed?: Set<number>;
}

function fontSize(total: number): string {
  if (total <= 16) return "text-2xl";
  if (total <= 24) return "text-xl";
  if (total <= 36) return "text-lg";
  if (total <= 48) return "text-base";
  return "text-sm";
}

export function SnakeText({ puzzle, cells, revealed }: Props) {
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
            {word.tokens.map((token, t) => {
              // Punctuation is given, not hidden, so it always wears the
              // accent. That is also what keeps a phrase's own question
              // mark from reading as one more blank letter.
              if (token.kind === "mark") {
                return (
                  <span key={`mark-${t}`} className="inline-block text-accent">
                    {token.char}
                  </span>
                );
              }
              const i = token.index;
              const letter =
                i < cells.length ? puzzle.grid[cells[i].row][cells[i].col] : null;
              const knownLetter =
                !letter && revealed?.has(i)
                  ? puzzle.grid[puzzle.path[i].row][puzzle.path[i].col]
                  : null;
              // data-glyph on all three arms, never on the mark above:
              // these are the spans that swap a `?` for a letter, so in
              // the proportional Accessible face they are the ones that
              // need a fixed advance (see index.css).
              return letter ? (
                <motion.span
                  key={`${i}-${letter}`}
                  data-glyph
                  className="inline-block text-accent"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                >
                  {letter}
                </motion.span>
              ) : knownLetter ? (
                // Known but not placed. NOT a lighter accent: the accent
                // clears AA on surface by 4.99:1 in light mode, so any
                // alpha on it fails — 50% measured 2.05:1, and these are
                // letters every player reads every day now, not the rare
                // hint they used to be. Neutral ink-soft carries them at
                // 5.18:1 / 6.27:1, and leaves the accent to mean one
                // thing: cells the player has actually traced.
                <span
                  key={`${i}-known`}
                  data-glyph
                  className="inline-block text-ink-soft"
                >
                  {knownLetter}
                </span>
              ) : (
                <span
                  key={`${i}-blank`}
                  data-glyph
                  className="inline-block text-ink-soft/70"
                >
                  ?
                </span>
              );
            })}
          </span>
        ))}
      </span>
    </div>
  );
}
