import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useViewport } from "../../../lib/useViewport";
import { type Cell, cellKey, cellsEqual } from "../engine/types";

interface Props {
  rows: number;
  cols: number;
  grid: string[][];
  cells: Cell[];
  claimed: Set<string>;
  solved: boolean;
  blocked: Set<string>;
  hintCells?: Set<string>;
  onTapCell: (row: number, col: number) => void;
  onUndo?: () => void;
  onClear?: () => void;
}

const NODE_R = 0.38;
const PIPE_W = 0.32;
const TRAIL_START = 0;
const TRAIL_END = 100;

/**
 * Largest a cell is ever drawn, before the space actually available
 * takes over. Scaled by the Text-size setting like every board.
 */
function maxCellPx(vw: number, rem: number): number {
  return (vw >= 768 ? 56 : 44) * (rem / 16);
}

/**
 * Smallest a cell may be squeezed to for want of HEIGHT. A cell is a tap
 * target, and the page-scroll rule does not outrank the touch one: below
 * this the board stops giving way and the page scrolls instead, which is
 * what the other boards do too (`MIN_CELL` in Doublet's).
 *
 * Deliberately not scaled by the Text-size setting — a thumb is the same
 * size whatever the type is set to.
 *
 * Width is a different matter and still binds absolutely: a board wider
 * than the screen cannot be tapped at all.
 */
const MIN_CELL = 44;

/**
 * Ceiling on the letter as a fraction of its cell. The letters ARE the
 * board here — the snake is drawn behind them in grid coordinates — so a
 * letter that outgrows its cell parts company with the circle it belongs
 * to. This is a cap rather than a ratio: the letter keeps its rem size,
 * which is what the Text-size setting is for, and only gives that up on a
 * cell too small to hold it.
 */
const LETTER_MAX_RATIO = 0.55;

export function SnakeGrid({
  rows,
  cols,
  grid,
  cells,
  claimed,
  solved,
  blocked,
  hintCells,
  onTapCell,
  onUndo,
  onClear,
}: Props) {
  const { vw, rem } = useViewport();
  const gridRef = useRef<HTMLDivElement>(null);

  /**
   * The board's height budget, measured rather than assumed.
   *
   * Every other board subtracts a CHROME_H constant from the viewport,
   * which works where the chrome is fixed. This screen's is not: the
   * poem credit wraps to one, two or three lines depending on the
   * title, and the readout's height follows the phrase's length. A
   * constant tuned on one puzzle is wrong for the next — and it was
   * wrong here, at 132px of page scroll on a 375×667 at Huge text.
   *
   * So the wrapper takes whatever space the flex column has left, and
   * the grid is absolutely positioned inside it: it contributes no
   * height of its own, which is what keeps this a measurement rather
   * than a feedback loop. Measuring also subsumes the `reservedH`
   * convention — the tutorial banner is simply chrome that leaves less
   * room, and needs no announcing.
   */
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

  // Infinity until measured, so a browser without ResizeObserver still
  // gets the old width-capped board rather than a collapsed one.
  const widthCap = box.w > 0 ? box.w / cols : Infinity;
  const heightCap = box.h > 0 ? box.h / rows : Infinity;

  // Height gives way only down to a tappable cell; width always binds.
  // Floored to a whole pixel: a fractional cell makes the board a
  // fraction taller than the box it was measured against, which is a
  // page scroll of one or two pixels and nothing else.
  const cellPx = Math.floor(
    Math.min(maxCellPx(vw, rem), widthCap, Math.max(heightCap, MIN_CELL)),
  );
  const gridW = cellPx * cols;
  const gridH = cellPx * rows;
  const letterPx = Math.min(rem, cellPx * LETTER_MAX_RATIO);

  /**
   * The height the wrapper must keep even when the column has less to
   * give: the board at its smallest permitted size. Past that the board
   * stops shrinking, so the column has to grow and the page scroll —
   * without this an absolutely positioned board just sits on top of the
   * controls.
   *
   * Derived from WIDTH only. A minHeight computed from the current cell
   * size feeds straight back into the height it is measured against, and
   * the board latches at whatever it first drew: on a 1024×700 it held
   * 59px cells and scrolled the page rather than shrinking the ~5px per
   * row that would have made it fit.
   */
  const floorCell = Math.floor(
    Math.min(maxCellPx(vw, rem), widthCap, MIN_CELL),
  );
  const minBoardH = floorCell * rows;
  const dragging = useRef(false);
  const lastDragCell = useRef<Cell | null>(null);
  const [cursorRow, setCursorRow] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(false);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "ArrowUp":
        case "ArrowDown":
        case "ArrowLeft":
        case "ArrowRight": {
          e.preventDefault();
          setCursorVisible(true);
          const dr = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
          const dc = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          setCursorRow((r) => Math.max(0, Math.min(rows - 1, r + dr)));
          setCursorCol((c) => Math.max(0, Math.min(cols - 1, c + dc)));
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          if (!solved) {
            setCursorVisible(true);
            onTapCell(cursorRow, cursorCol);
          }
          break;
        }
        case "Backspace": {
          e.preventDefault();
          if (!solved) onUndo?.();
          break;
        }
        case "Escape": {
          e.preventDefault();
          if (!solved) onClear?.();
          break;
        }
      }
    },
    [rows, cols, cursorRow, cursorCol, solved, onTapCell, onUndo, onClear],
  );

  const cellFromPoint = useCallback(
    (x: number, y: number): Cell | null => {
      const el = gridRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const cellW = rect.width / cols;
      const cellH = rect.height / rows;
      const col = Math.floor((x - rect.left) / cellW);
      const row = Math.floor((y - rect.top) / cellH);
      if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
      if (blocked.has(cellKey({ row, col }))) return null;
      return { row, col };
    },
    [rows, cols, blocked],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (solved) return;
      e.preventDefault();
      dragging.current = true;
      lastDragCell.current = null;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const cell = cellFromPoint(e.clientX, e.clientY);
      if (cell) {
        lastDragCell.current = cell;
        onTapCell(cell.row, cell.col);
      }
    },
    [solved, cellFromPoint, onTapCell],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || solved) return;
      const cell = cellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      if (lastDragCell.current && cellsEqual(lastDragCell.current, cell))
        return;
      lastDragCell.current = cell;
      onTapCell(cell.row, cell.col);
    },
    [solved, cellFromPoint, onTapCell],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    lastDragCell.current = null;
  }, []);

  const n = cells.length;
  const accent = solved ? "var(--color-good)" : "var(--color-accent)";
  const trail = "var(--color-accent-trail)";

  function nodeColor(i: number): string {
    if (solved) return accent;
    const pct = n <= 1 ? TRAIL_END : TRAIL_START + (TRAIL_END - TRAIL_START) * (i / (n - 1));
    return `color-mix(in oklch, ${accent} ${Math.round(pct)}%, ${trail})`;
  }

  // The wrapper is flex-1 min-h-0 rather than h-full: the grid inside it
  // is absolute, so the box has no content height for a percentage to
  // resolve against — the flex algorithm has to give it one.
  return (
    <div
      ref={wrapRef}
      className="relative w-full min-h-0 flex-1"
      style={{ minHeight: minBoardH }}
    >
      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label="Puzzle grid"
        className="absolute inset-0 m-auto select-none touch-manipulation outline-none"
        style={{
          width: gridW,
          height: gridH,
          maxWidth: "100%",
        }}
        onPointerDown={(e) => {
          setCursorVisible(false);
          onPointerDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onFocus={() => setCursorVisible(true)}
        onBlur={() => setCursorVisible(false)}
      >
        {/* SVG overlay: gradient snake with circles + pipes */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${cols} ${rows}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {n > 0 && (
            <g>
              {/* Pipe connectors */}
              {cells.map((c, i) => {
                if (i === 0) return null;
                const prev = cells[i - 1];
                return (
                  <line
                    key={`pipe-${i}`}
                    x1={prev.col + 0.5}
                    y1={prev.row + 0.5}
                    x2={c.col + 0.5}
                    y2={c.row + 0.5}
                    style={{ stroke: nodeColor(i) }}
                    strokeWidth={PIPE_W}
                    strokeLinecap="round"
                  />
                );
              })}
              {/* Node circles */}
              {cells.map((c, i) => (
                <circle
                  key={`node-${i}`}
                  cx={c.col + 0.5}
                  cy={c.row + 0.5}
                  r={NODE_R}
                  style={{ fill: nodeColor(i) }}
                />
              ))}
            </g>
          )}
        </svg>

        {/* Grid cells — letters sit on top of SVG */}
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const k = cellKey({ row: r, col: c });
              const isBlocked = blocked.has(k);
              const isClaimed = claimed.has(k);
              const isHint = !isBlocked && !isClaimed && !!hintCells?.has(k);
              const isCursor = cursorVisible && r === cursorRow && c === cursorCol && !isBlocked;
              return (
                <div
                  key={k}
                  className={[
                    "relative flex items-center justify-center rounded-full font-game",
                    isBlocked ? "" : "text-ink",
                    isCursor ? "ring-2 ring-accent ring-offset-1" : "",
                  ].join(" ")}
                  style={{
                    fontSize: `${letterPx}px`,
                    lineHeight: 1,
                    ...(isBlocked
                      ? { visibility: "hidden" as const }
                      : isClaimed
                        ? { color: "var(--color-surface)" }
                        : isHint
                          ? { color: "var(--color-accent)" }
                          : null),
                  }}
                >
                  {!isBlocked && (
                    <span className="relative z-10 select-none">{grid[r][c]}</span>
                  )}
                  {isHint && (
                    <span
                      className="absolute inset-[15%] rounded-full"
                      style={{
                        border: "2px solid var(--color-accent)",
                        opacity: 0.5,
                      }}
                    />
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
