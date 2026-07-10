import { useCallback, useRef } from "react";
import { type Cell, cellKey, cellsEqual } from "../engine/types";
import type { SnakeProgress } from "../state/reducer";

interface Props {
  rows: number;
  cols: number;
  grid: string[][];
  paths: SnakeProgress[];
  activeSnake: number;
  solved: boolean;
  onTapCell: (row: number, col: number) => void;
}

const SNAKE_COLORS = [
  "var(--color-accent)",
  "var(--color-warn)",
  "var(--color-good)",
];

function snakeColor(index: number, isActive: boolean, matched: boolean): string {
  if (matched) return "var(--color-good)";
  if (!isActive) return SNAKE_COLORS[index % SNAKE_COLORS.length];
  return "var(--color-accent)";
}

function snakeOpacity(isActive: boolean, matched: boolean): number {
  if (matched) return 0.9;
  return isActive ? 1 : 0.35;
}

export function SnakeGrid({
  rows,
  cols,
  grid,
  paths,
  activeSnake,
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

  // Build cell lookup: which snake owns each cell?
  const cellOwner = new Map<string, number>();
  const cellIndex = new Map<string, number>();
  for (let si = 0; si < paths.length; si++) {
    for (let ci = 0; ci < paths[si].cells.length; ci++) {
      const key = cellKey(paths[si].cells[ci]);
      cellOwner.set(key, si);
      cellIndex.set(key, ci);
    }
  }

  // Build SVG path data: connectors + dots per snake.
  const svgSnakes: {
    color: string;
    opacity: number;
    cells: { cx: number; cy: number }[];
  }[] = [];
  for (let si = 0; si < paths.length; si++) {
    const p = paths[si];
    if (p.cells.length === 0) continue;
    const isActive = si === activeSnake;
    const matched = p.matchedSnake >= 0;
    svgSnakes.push({
      color: snakeColor(si, isActive, matched),
      opacity: snakeOpacity(isActive, matched),
      cells: p.cells.map((c) => ({ cx: c.col + 0.5, cy: c.row + 0.5 })),
    });
  }

  const gap = 3;

  return (
    <div
      ref={gridRef}
      className="relative mx-auto w-full select-none touch-manipulation"
      style={{
        maxWidth: `min(100%, ${cols * 56 + (cols - 1) * gap}px)`,
        aspectRatio: `${cols} / ${rows}`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* SVG overlay: thick path + node dots = the snake */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${cols} ${rows}`}
        preserveAspectRatio="none"
      >
        {svgSnakes.map((snake, si) => {
          if (snake.cells.length === 0) return null;
          const d = snake.cells
            .map((c, i) => `${i === 0 ? "M" : "L"} ${c.cx} ${c.cy}`)
            .join(" ");
          const tail = snake.cells[snake.cells.length - 1];
          return (
            <g key={si} opacity={snake.opacity}>
              {/* Path line */}
              <path
                d={d}
                fill="none"
                stroke={snake.color}
                strokeWidth={0.32}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Node dots */}
              {snake.cells.map((c, ci) => (
                <circle
                  key={ci}
                  cx={c.cx}
                  cy={c.cy}
                  r={0.14}
                  fill={snake.color}
                />
              ))}
              {/* Tail ring — shows the extend point */}
              {!solved && (
                <circle
                  cx={tail.cx}
                  cy={tail.cy}
                  r={0.24}
                  fill="none"
                  stroke={snake.color}
                  strokeWidth={0.06}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Grid cells */}
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const key = cellKey({ row: r, col: c });
            const owner = cellOwner.get(key);
            const isOwned = owner !== undefined;
            const isActive = owner === activeSnake;
            const matched = isOwned && paths[owner].matchedSnake >= 0;

            return (
              <div
                key={key}
                className={[
                  "relative flex items-center justify-center rounded-lg font-game text-sm transition-colors",
                  isOwned ? "bg-surface-tint" : "bg-tile",
                  matched
                    ? "text-good font-bold"
                    : isActive
                      ? "text-accent"
                      : isOwned
                        ? "text-ink-soft"
                        : "text-ink",
                ].join(" ")}
              >
                <span className="relative z-10 select-none">{grid[r][c]}</span>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
