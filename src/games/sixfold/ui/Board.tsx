import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { useViewport } from "../../../lib/useViewport";
import { cluedCells, hiddenCells } from "../engine/hints";
import type { SixfoldPuzzle } from "../engine/types";
import { N } from "../engine/types";
import { BLANK } from "../state/reducer";

/** Smallest tappable cell — past this the page scrolls instead. */
const MIN_CELL = 44;
/** A solved board is never tapped again, so it may shrink past the touch
 *  floor to make room for the results (it used to push Share off-screen). */
const SOLVED_MIN_CELL = 26;
/** Largest cell at default text, so a tablet doesn't get a billboard. */
const MAX_CELL = 64;
/** The letter's size at default text; it scales with the Text-size setting. */
const LETTER_PX = 30;
/** ...but never outgrows this share of its cell (a CAP, see CLAUDE.md). */
const LETTER_MAX_RATIO = 0.52;
/** The board's outer rule, drawn by the grid so its corners can round. */
const FRAME = 2;

const MOVES: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

interface Props {
  puzzle: SixfoldPuzzle;
  entries: string;
  revealed: readonly number[];
  selected: number | null;
  /** Cells sharing a unit with the selection. */
  peers: ReadonlySet<number>;
  /** The selected cell's letter — ringed wherever else it sits. */
  focusLetter: string | null;
  /** The player's letters that repeat (never givens or hints). */
  repeats: ReadonlySet<number>;
  /** A full board's word line that isn't its word. */
  wrong: ReadonlySet<number>;
  solved: boolean;
  onTap: (cell: number) => void;
  /** Keyboard focus reached a cell. */
  onFocusCell: (cell: number) => void;
  onMove: (dRow: number, dCol: number) => void;
}

/**
 * The 6×6 board, measured into whatever height the flex column leaves it
 * (SnakeGrid's pattern: the clue card wraps to one or two lines, so a
 * fixed chrome budget would be wrong for half the days). The grid is
 * absolute inside a `flex-1 min-h-0` wrapper so it contributes no height
 * of its own — a measurement, not a feedback loop.
 *
 * Layers, so no state hides another: FILLS are for the word lines only
 * (and the solved words); the selection is a thick inset RING, a matching
 * letter a thin one; the selection's row/column/box is a wash layered on
 * top of the fill; a repeat is warn-colored with a corner mark, so it
 * never relies on color alone.
 *
 * Keyboard: one Tab stop (roving tabindex on the selected cell); arrows
 * move the selection and focus with it.
 */
export function Board({
  puzzle,
  entries,
  revealed,
  selected,
  peers,
  focusLetter,
  repeats,
  wrong,
  solved,
  onTap,
  onFocusCell,
  onMove,
}: Props) {
  const { vw, rem } = useViewport();
  const wrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
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

  // Keyboard focus follows the selection — but only while focus is
  // already in the grid, so a tap never pulls focus from elsewhere.
  useEffect(() => {
    const grid = gridRef.current;
    if (selected === null || !grid || !grid.contains(document.activeElement)) return;
    grid.querySelector<HTMLElement>(`[data-cell="${selected}"]`)?.focus();
  }, [selected]);

  const maxCell = (MAX_CELL * rem) / 16;
  const floorCell = solved ? SOLVED_MIN_CELL : MIN_CELL;
  const widthCap = ((box.w > 0 ? box.w : vw - 40) - 2 * FRAME) / N;
  const heightCap = box.h > 0 ? (box.h - 2 * FRAME) / N : Infinity;
  // Height gives way only down to a tappable cell; width always binds.
  // Whole pixels, so the board is never a fraction taller than its box.
  const cellPx = Math.floor(Math.min(maxCell, widthCap, Math.max(heightCap, floorCell)));
  // The floor the column must keep: derived from WIDTH only, or it
  // feeds back into the height it is measured against.
  const minBoardH = Math.floor(Math.min(maxCell, widthCap, floorCell)) * N + 2 * FRAME;
  const boardPx = cellPx * N + 2 * FRAME;
  const letterPx = Math.floor(Math.min((LETTER_PX * rem) / 16, cellPx * LETTER_MAX_RATIO));
  const markPx = Math.max(7, Math.round(cellPx * 0.2));

  const hidden = new Set(hiddenCells(puzzle));
  const clued = new Set(cluedCells(puzzle));
  const given = new Set(puzzle.givens);
  const hinted = new Set(revealed);
  const { regions } = puzzle;
  const tabCell = selected ?? 0;
  const lineName = puzzle.col < 0 ? "diagonal" : `column ${puzzle.col + 1}, hidden word`;

  const onKeyDown = (e: KeyboardEvent) => {
    const move = MOVES[e.key];
    if (!move) return;
    e.preventDefault();
    onMove(move[0], move[1]);
  };

  const rows: ReactElement[] = [];
  for (let r = 0; r < N; r++) {
    const cells: ReactElement[] = [];
    for (let col = 0; col < N; col++) {
      const c = r * N + col;
      const ch = entries[c];
      const filled = ch !== BLANK;
      // Region edges draw heavy; the rest hairline. Each cell owns its top
      // and left edge (plus the board's outer right/bottom).
      const top = r === 0 || regions[c - N] !== regions[c];
      const left = col === 0 || regions[c - 1] !== regions[c];
      const onLine = hidden.has(c) || clued.has(c);
      const isSel = c === selected;
      const repeat = repeats.has(c);
      const match = !isSel && filled && focusLetter !== null && ch === focusLetter;

      // The selection is a solid accent tile: a tint alone sat within
      // 1.3:1 of the word-line shading and was easy to lose.
      const fill = solved
        ? onLine
          ? "bg-accent"
          : "bg-surface"
        : isSel
          ? "bg-accent"
          : wrong.has(c)
          ? "bg-warn/15"
          : onLine
            ? "bg-(--sixfold-line)"
            : "bg-surface";
      const tone = solved
        ? onLine
          ? "text-surface"
          : "text-ink"
        : isSel
          ? "text-surface"
          : repeat
          ? "text-warn"
          : given.has(c)
            ? "text-ink"
            : hinted.has(c)
              ? "text-ink"
              : "text-accent";
      const wash =
        !solved && !isSel && peers.has(c)
          ? "[background-image:linear-gradient(var(--sixfold-peer),var(--sixfold-peer))]"
          : "";
      const ring = isSel
        ? ""
        : match
          ? "shadow-[inset_0_0_0_2px_var(--sixfold-match)]"
          : "";

      const line =
        (clued.has(c) ? ", clued row" : hidden.has(c) ? `, ${lineName}` : "") +
        (wrong.has(c) ? ", not the word" : "");
      const what = filled
        ? `${ch.toUpperCase()}${given.has(c) ? ", given" : hinted.has(c) ? ", hint" : ""}${
            repeat ? ", repeats" : ""
          }`
        : "empty";
      cells.push(
        <button
          key={c}
          type="button"
          role="gridcell"
          data-cell={c}
          tabIndex={c === tabCell ? 0 : -1}
          aria-label={`Row ${r + 1}, column ${col + 1}${line}: ${what}`}
          aria-selected={isSel}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onTap(c)}
          onFocus={() => onFocusCell(c)}
          className={`relative box-border flex items-center justify-center font-game focus:outline-none focus-visible:z-10 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-6px] ${
            isSel && !solved ? "focus-visible:outline-surface" : "focus-visible:outline-ink"
          } ${fill} ${tone} ${wash} ${ring} ${
            r === 0 ? "" : top ? "border-t-2 border-t-(--sixfold-box)" : "border-t border-t-(--sixfold-hair)"
          } ${col === 0 ? "" : left ? "border-l-2 border-l-(--sixfold-box)" : "border-l border-l-(--sixfold-hair)"}`}
          style={{ width: cellPx, height: cellPx, fontSize: letterPx, lineHeight: 1 }}
        >
          {filled ? ch.toUpperCase() : ""}
          {hinted.has(c) && !solved && !isSel && (
            // A hint is locked like a given; the dot says where it came
            // from (grey letters read as disabled or pencilled in).
            <span
              aria-hidden
              className="absolute rounded-full bg-accent"
              style={{ width: Math.max(4, Math.round(cellPx * 0.09)), height: Math.max(4, Math.round(cellPx * 0.09)), right: Math.round(cellPx * 0.1), bottom: Math.round(cellPx * 0.1) }}
            />
          )}
          {repeat && (
            // The corner mark: a repeat reads without color, too.
            <span
              aria-hidden
              className="absolute top-0 right-0 border-t-warn border-l-transparent"
              style={{ borderTopWidth: markPx, borderLeftWidth: markPx }}
            />
          )}
        </button>,
      );
    }
    rows.push(
      <div key={r} role="row" className="flex">
        {cells}
      </div>,
    );
  }

  return (
    <div ref={wrapRef} className="relative w-full min-h-0 flex-1" style={{ minHeight: minBoardH }}>
      <div
        ref={gridRef}
        role="grid"
        aria-label="Puzzle grid"
        // Focus lives on the cells (roving tabindex); the grid itself is
        // only programmatically focusable.
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="absolute inset-0 m-auto flex flex-col overflow-hidden rounded-xl border-2 border-(--sixfold-box) touch-manipulation select-none"
        style={{ width: boardPx, height: boardPx }}
      >
        {rows}
      </div>
    </div>
  );
}
