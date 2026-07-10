import { useRef } from "react";
import { motion, type PanInfo } from "motion/react";
import { toMultiset } from "../engine/types";
import { dragCancelled, dragPoint } from "./dragPoint";

/**
 * The day's rack: one socket per bank letter (sorted a-z). A tile
 * LEAVES its socket when placed — the same tile appears on the board
 * (layoutId flies it there) and the empty socket stays behind, so the
 * rack reads like a physical tray.
 *
 * Tiles tap to place and drag onto the board; typing works too.
 */
export function LetterBank({
  all,
  remaining,
  onLetter,
  onDragLive,
}: {
  /** puzzle.bank — the full day, fixed. */
  all: string[];
  /** state.bank — letters still available. */
  remaining: string[];
  onLetter: (letter: string) => void;
  /** Stream drag positions so the mirror can reflect the tile live. */
  onDragLive: (
    letter: string | null,
    e?: MouseEvent | TouchEvent | PointerEvent,
    info?: PanInfo,
  ) => void;
}) {
  const left = toMultiset(remaining);
  const seen: Record<string, number> = {};
  // A dragged tile moves WITH the pointer, so the pointer never leaves
  // it and motion's tap gesture completes too — onTap after onDragEnd
  // would place the letter twice. One gesture at a time: a shared flag,
  // cleared a frame after the drag resolves, keeps taps honest.
  const draggingRef = useRef(false);
  return (
    <div className="flex flex-wrap justify-center gap-1.5 select-none">
      {all.map((letter, i) => {
        // The LAST duplicates leave first, so the leftmost copy of
        // each letter stays racked longest — matches the board's
        // layoutId assignment.
        const idx = (seen[letter] = (seen[letter] ?? 0) + 1);
        const available = idx <= (left[letter] ?? 0);
        if (!available) {
          // Empty socket: the tile is out on the board. Decorative —
          // "N letters left" and the play-by-play carry the state
          // (aria-label on a plain div announces nothing anyway).
          return (
            <div
              key={i}
              aria-hidden
              className="h-11 w-9 rounded-lg border-2 border-dashed border-line"
            />
          );
        }
        return (
          <motion.button
            key={i}
            type="button"
            // House rule: game-surface buttons never steal focus — a
            // drag would otherwise focus the tile and hijack Enter.
            onPointerDown={(e) => e.preventDefault()}
            layoutId={`bwtile-${i}`}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            drag
            dragSnapToOrigin
            dragMomentum={false}
            whileDrag={{ scale: 1.25, zIndex: 40 }}
            whileTap={{ scale: 0.9 }}
            onDragStart={() => (draggingRef.current = true)}
            onDrag={(e, info) => onDragLive(letter, e, info)}
            onDragEnd={(e, info) => {
              requestAnimationFrame(() => (draggingRef.current = false));
              onDragLive(null);
              if (dragCancelled(e)) return; // system stole the gesture
              // Dropped over the board — EITHER side of the glass —
              // and the tile moves there.
              const board = document.getElementById("bw-board");
              const p = dragPoint(e, info);
              if (!board || !p) return;
              const r = board.getBoundingClientRect();
              if (
                p.x >= r.left &&
                p.x <= r.right &&
                p.y >= r.top &&
                p.y <= r.bottom
              ) {
                onLetter(letter);
              }
            }}
            onTap={() => {
              if (!draggingRef.current) onLetter(letter);
            }}
            aria-label={`letter ${letter}`}
            className="relative flex h-11 w-9 items-center justify-center rounded-lg bg-tile font-game text-lg text-ink uppercase shadow-sm"
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
