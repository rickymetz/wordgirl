import { useCallback, useRef } from "react";
import { type Cell, cellKey, cellsEqual } from "../engine/types";

interface Props {
  rows: number;
  cols: number;
  grid: string[][];
  targetLen: number;
  cells: Cell[];
  solved: boolean;
  onTapCell: (row: number, col: number) => void;
}

const NODE_R = 0.38;
const PIPE_W = 0.32;
const START_OPACITY = 0.25;
const END_OPACITY = 0.5;

export function SnakeGrid({
  rows,
  cols,
  grid,
  cells,
  solved,
  onTapCell,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastDragCell = useRef<Cell | null>(null);

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
      return { row, col };
    },
    [rows, cols],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (solved) return;
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
  const color = solved ? "var(--color-good)" : "var(--color-accent)";

  function nodeOpacity(i: number): number {
    if (solved) return 0.4;
    if (n <= 1) return END_OPACITY;
    return START_OPACITY + (END_OPACITY - START_OPACITY) * (i / (n - 1));
  }

  return (
    <div
      ref={gridRef}
      className="relative mx-auto w-full select-none touch-manipulation"
      style={{
        maxWidth: `min(100%, ${cols * 44}px)`,
        aspectRatio: `${cols} / ${rows}`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* SVG overlay: gradient snake with circles + pipes */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${cols} ${rows}`}
        preserveAspectRatio="none"
      >
        {n > 0 && (
          <g>
            {/* Pipe connectors */}
            {cells.map((c, i) => {
              if (i === 0) return null;
              const prev = cells[i - 1];
              const opacity = nodeOpacity(i);
              return (
                <line
                  key={`pipe-${i}`}
                  x1={prev.col + 0.5}
                  y1={prev.row + 0.5}
                  x2={c.col + 0.5}
                  y2={c.row + 0.5}
                  stroke={color}
                  strokeOpacity={opacity}
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
                fill={color}
                fillOpacity={nodeOpacity(i)}
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
          Array.from({ length: cols }, (_, c) => (
            <div
              key={cellKey({ row: r, col: c })}
              className="relative flex items-center justify-center rounded-full font-game text-sm text-ink"
            >
              <span className="relative z-10 select-none">{grid[r][c]}</span>
            </div>
          )),
        )}
      </div>
    </div>
  );
}
