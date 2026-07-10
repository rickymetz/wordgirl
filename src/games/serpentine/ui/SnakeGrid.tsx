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
  if (matched) return 0.85;
  return isActive ? 1 : 0.4;
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
      if (
        lastDragCell.current &&
        cellsEqual(lastDragCell.current, cell)
      )
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

  // Build connector segments for SVG overlay.
  const connectors: {
    r1: number; c1: number; r2: number; c2: number;
    color: string; opacity: number;
  }[] = [];
  for (let si = 0; si < paths.length; si++) {
    const p = paths[si];
    const isActive = si === activeSnake;
    const color = snakeColor(si, isActive, p.matchedSnake >= 0);
    const opacity = snakeOpacity(isActive, p.matchedSnake >= 0);
    for (let ci = 1; ci < p.cells.length; ci++) {
      connectors.push({
        r1: p.cells[ci - 1].row,
        c1: p.cells[ci - 1].col,
        r2: p.cells[ci].row,
        c2: p.cells[ci].col,
        color,
        opacity,
      });
    }
  }

  const gap = 3;

  return (
    <div
      ref={gridRef}
      className="relative mx-auto aspect-square w-full select-none touch-manipulation"
      style={{
        maxWidth: `min(100%, ${cols * 56 + (cols - 1) * gap}px)`,
        aspectRatio: `${cols} / ${rows}`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* SVG connector overlay */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${cols} ${rows}`}
        preserveAspectRatio="none"
      >
        {connectors.map((seg, i) => (
          <line
            key={i}
            x1={seg.c1 + 0.5}
            y1={seg.r1 + 0.5}
            x2={seg.c2 + 0.5}
            y2={seg.r2 + 0.5}
            stroke={seg.color}
            strokeOpacity={seg.opacity}
            strokeWidth={0.35}
            strokeLinecap="round"
          />
        ))}
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
            const ci = cellIndex.get(key);
            const isOwned = owner !== undefined;
            const isActivePath = owner === activeSnake;
            const isMatched =
              isOwned && paths[owner].matchedSnake >= 0;
            const isTail =
              isActivePath &&
              ci === paths[activeSnake].cells.length - 1;

            let bg = "bg-tile";
            let textColor = "text-ink";
            if (isMatched) {
              bg = "";
              textColor = "text-surface";
            } else if (isActivePath) {
              bg = "";
              textColor = "text-surface";
            } else if (isOwned) {
              bg = "";
              textColor = "text-surface";
            }

            const bgStyle: React.CSSProperties = isOwned
              ? {
                  backgroundColor: snakeColor(
                    owner,
                    owner === activeSnake,
                    paths[owner].matchedSnake >= 0,
                  ),
                  opacity: snakeOpacity(
                    owner === activeSnake,
                    paths[owner].matchedSnake >= 0,
                  ),
                }
              : {};

            return (
              <div
                key={key}
                className={`relative flex items-center justify-center rounded-lg font-game text-sm transition-colors ${
                  !isOwned ? bg : ""
                } ${textColor} ${isTail && !solved ? "ring-2 ring-accent" : ""}`}
                style={isOwned ? { backgroundColor: bgStyle.backgroundColor } : undefined}
              >
                {/* Background with opacity */}
                {isOwned && (
                  <div
                    className="absolute inset-0 rounded-lg"
                    style={bgStyle}
                  />
                )}
                <span className="relative z-10 select-none">
                  {grid[r][c]}
                </span>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
