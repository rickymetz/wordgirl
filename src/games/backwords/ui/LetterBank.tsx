import { motion } from "motion/react";
import { toMultiset } from "../engine/types";

/**
 * The day's rack: one fixed tile per bank letter (sorted a-z), dimmed
 * while a letter is staged or committed — tiles never move or vanish,
 * so nothing reflows as letters travel to the board and back.
 *
 * Tiles TAP to stage, and also DRAG: pick one up and drop it anywhere
 * on the board to lay it against the mirror. The tile itself snaps
 * home (dimmed) — the letter is what traveled.
 */
export function LetterBank({
  all,
  remaining,
  onLetter,
}: {
  /** puzzle.bank — the full day, fixed. */
  all: string[];
  /** state.bank — letters still available. */
  remaining: string[];
  onLetter: (letter: string) => void;
}) {
  const left = toMultiset(remaining);
  const seen: Record<string, number> = {};
  return (
    <div className="flex flex-wrap justify-center gap-1.5 select-none">
      {all.map((letter, i) => {
        // Dim the LAST duplicates first so the leftmost copy of each
        // letter stays live longest — stable, predictable dimming.
        const idx = (seen[letter] = (seen[letter] ?? 0) + 1);
        const available = idx <= (left[letter] ?? 0);
        return (
          <motion.button
            key={i}
            type="button"
            disabled={!available}
            drag={available}
            dragSnapToOrigin
            dragMomentum={false}
            whileDrag={{ scale: 1.25, zIndex: 40 }}
            whileTap={available ? { scale: 0.9 } : undefined}
            onDragEnd={(e) => {
              // Dropped over the board? The letter joins the row.
              const board = document.getElementById("bw-board");
              const p = e as PointerEvent;
              if (!board || p.clientX === undefined) return;
              const r = board.getBoundingClientRect();
              if (
                p.clientX >= r.left &&
                p.clientX <= r.right &&
                p.clientY >= r.top &&
                p.clientY <= r.bottom
              ) {
                onLetter(letter);
              }
            }}
            onTap={() => onLetter(letter)}
            aria-label={
              available ? `letter ${letter}` : `letter ${letter} — placed`
            }
            className={`relative flex h-11 w-9 items-center justify-center rounded-lg font-game text-lg uppercase ${
              available
                ? "bg-tile text-ink"
                : "bg-tile/40 text-ink-soft/40"
            }`}
            // touch-action none: the drag must win over page scrolling.
            style={{ touchAction: "none" }}
          >
            {letter}
          </motion.button>
        );
      })}
    </div>
  );
}
