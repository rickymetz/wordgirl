import { useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { useViewport } from "../../../lib/useViewport";
import type { AnagridPuzzle } from "../engine/types";
import { CELLS, N } from "../engine/types";
import { BLANK } from "../state/reducer";

/** Smallest tappable cell — past this the page scrolls instead. */
const MIN_CELL = 44;
/** Largest cell, so a tablet doesn't get a billboard. */
const MAX_CELL = 64;
/** A letter never outgrows this share of its cell (see CLAUDE.md). */
const LETTER_MAX_RATIO = 0.52;

export function hiddenCells(p: AnagridPuzzle): number[] {
  return Array.from({ length: N }, (_, i) => (p.col < 0 ? i * N + i : i * N + p.col));
}

export function cluedCells(p: AnagridPuzzle): number[] {
  return Array.from({ length: N }, (_, c) => p.row * N + c);
}

interface Props {
  puzzle: AnagridPuzzle;
  entries: string;
  revealed: readonly number[];
  selected: number | null;
  /** Cells sharing a unit with the selection. */
  peers: ReadonlySet<number>;
  /** The letter to highlight everywhere it sits (selection's, or the tool's). */
  focusLetter: string | null;
  conflicts: ReadonlySet<number>;
  solved: boolean;
  onTap: (cell: number) => void;
}

/**
 * The 6×6 board, measured into whatever height the flex column leaves it
 * (SnakeGrid's pattern: the clue card wraps to one or two lines, so a
 * fixed chrome budget would be wrong for half the days). The grid is
 * absolute inside a `flex-1 min-h-0` wrapper so it contributes no height
 * of its own — a measurement, not a feedback loop.
 */
export function Board({
  puzzle,
  entries,
  revealed,
  selected,
  peers,
  focusLetter,
  conflicts,
  solved,
  onTap,
}: Props) {
  const { vw } = useViewport();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const widthCap = box.w > 0 ? box.w / N : (vw - 40) / N;
  const heightCap = box.h > 0 ? box.h / N : Infinity;
  // Height gives way only down to a tappable cell; width always binds.
  // Whole pixels, so the board is never a fraction taller than its box.
  const cellPx = Math.floor(
    Math.min(MAX_CELL, widthCap, Math.max(heightCap, MIN_CELL)),
  );
  // The floor the column must keep: derived from WIDTH only, or it
  // feeds back into the height it is measured against.
  const minBoardH = Math.floor(Math.min(MAX_CELL, widthCap, MIN_CELL)) * N;
  const boardPx = cellPx * N;
  const letterPx = Math.floor(cellPx * LETTER_MAX_RATIO);

  const hidden = new Set(hiddenCells(puzzle));
  const given = new Set(puzzle.givens);
  const hinted = new Set(revealed);
  const { regions } = puzzle;

  const cells: ReactElement[] = [];
  for (let c = 0; c < CELLS; c++) {
    const r = Math.floor(c / N);
    const col = c % N;
    const ch = entries[c];
    const filled = ch !== BLANK;
    // Region edges draw heavy; the rest hairline. Each cell owns its top
    // and left edge (plus the board's outer right/bottom).
    const top = r === 0 || regions[c - N] !== regions[c];
    const left = col === 0 || regions[c - 1] !== regions[c];
    const isSel = c === selected;
    const conflict = conflicts.has(c);
    const sameLetter = filled && focusLetter !== null && ch === focusLetter;
    const bg = conflict
      ? "bg-warn/15"
      : isSel
        ? "bg-accent/30"
        : sameLetter
          ? "bg-accent/15"
          : hidden.has(c)
            ? "bg-surface-tint"
            : peers.has(c)
              ? "bg-ink/5"
              : "bg-surface";
    const tone = conflict
      ? "text-warn"
      : solved || !(given.has(c) || hinted.has(c))
        ? "text-accent"
        : hinted.has(c)
          ? "text-ink-soft"
          : "text-ink";
    const where = `Row ${r + 1}, column ${col + 1}`;
    const what = filled
      ? `${ch.toUpperCase()}${given.has(c) ? ", given" : hinted.has(c) ? ", hint" : ""}${conflict ? ", repeats" : ""}`
      : "empty";
    cells.push(
      <button
        key={c}
        type="button"
        role="gridcell"
        aria-label={`${where}: ${what}`}
        aria-selected={isSel}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => onTap(c)}
        className={`flex items-center justify-center font-game ${bg} ${tone} ${
          top ? "border-t-2 border-t-ink" : "border-t border-t-line"
        } ${left ? "border-l-2 border-l-ink" : "border-l border-l-line"} ${
          col === N - 1 ? "border-r-2 border-r-ink" : ""
        } ${r === N - 1 ? "border-b-2 border-b-ink" : ""}`}
        style={{ width: cellPx, height: cellPx, fontSize: letterPx, lineHeight: 1 }}
      >
        {filled ? ch.toUpperCase() : ""}
      </button>,
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative w-full min-h-0 flex-1"
      style={{ minHeight: minBoardH }}
    >
      <div
        role="grid"
        aria-label="Puzzle grid"
        className="absolute inset-0 m-auto grid touch-manipulation select-none"
        style={{
          width: boardPx,
          height: boardPx,
          gridTemplateColumns: `repeat(${N}, ${cellPx}px)`,
        }}
      >
        {Array.from({ length: N }, (_, r) => (
          <div key={r} role="row" className="contents">
            {cells.slice(r * N, r * N + N)}
          </div>
        ))}
        {/* The clued row: outlined over the cells, so it reads as ONE
            entry the way a crossword's across does. */}
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-md border-[3px] border-accent"
          style={{
            left: -3,
            top: puzzle.row * cellPx - 3,
            width: boardPx + 6,
            height: cellPx + 6,
          }}
        />
      </div>
    </div>
  );
}
