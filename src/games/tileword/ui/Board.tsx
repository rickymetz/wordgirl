import { useMemo, useRef } from "react";
import { motion } from "motion/react";
import { useViewport } from "../../../lib/useViewport";
import type { GameState } from "../state/reducer";
import {
  cellKey,
  dominoCells,
  dominoLetters,
  type Cell,
  type Orientation,
} from "../engine/types";

const GAP = 6;
const BW = 2;
const MAX_CELL = 56;
const MIN_CELL = 32;
const CHROME_H = 360;
const OUTLINE_PAD = 3;
const BOARD_DRAG_THRESHOLD = 64;

interface Props {
  state: GameState;
  onCellTap: (cell: Cell) => void;
  onTapPlaced?: (dominoId: number) => void;
  onBoardDragStart?: (dominoId: number, orientation: Orientation) => void;
  onBoardDragMove?: (x: number, y: number) => void;
  onBoardDragEnd?: () => void;
  hoverCell?: Cell | null;
  resolvedAnchor?: Cell | null;
  previewOrientation?: Orientation | null;
}

export function Board({ state, onCellTap, onTapPlaced, onBoardDragStart, onBoardDragMove, onBoardDragEnd, hoverCell, resolvedAnchor, previewOrientation }: Props) {
  const { puzzle, grid, invalidSlots } = state;
  const { vw, vh, rem } = useViewport();

  const wCell =
    (Math.min(360, vw - 32) - (puzzle.board.cols - 1) * GAP) / puzzle.board.cols;
  const hCell =
    (vh - CHROME_H * (rem / 16) - (puzzle.board.rows - 1) * GAP) /
    puzzle.board.rows;
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, wCell, hCell));

  const boardCellSet = useMemo(
    () => new Set(puzzle.board.cells.map((c) => cellKey(c.row, c.col))),
    [puzzle.board.cells],
  );

  const invalidCells = new Set<string>();
  for (const si of invalidSlots) {
    for (const c of puzzle.slots[si].cells) {
      invalidCells.add(cellKey(c.row, c.col));
    }
  }

  const previewCells = useMemo(() => {
    if (previewOrientation == null) return null;
    if (resolvedAnchor) {
      const [c1, c2] = dominoCells(resolvedAnchor, previewOrientation);
      return { keys: new Set([cellKey(c1.row, c1.col), cellKey(c2.row, c2.col)]), valid: true };
    }
    if (!hoverCell) return null;
    const [c1, c2] = dominoCells(hoverCell, previewOrientation);
    return { keys: new Set([cellKey(c1.row, c1.col), cellKey(c2.row, c2.col)]), valid: false };
  }, [hoverCell, resolvedAnchor, previewOrientation]);

  const dominoIndex = useMemo(() => {
    const byId = new Map<number, { cells: [Cell, Cell]; letters: [string, string] }>();
    const byCell = new Map<string, import("../engine/types").PlacedDomino>();
    for (const p of state.placed) {
      const piece = puzzle.dominoes.find((d) => d.id === p.dominoId);
      if (!piece) continue;
      const [c1, c2] = dominoCells(p.anchor, p.orientation);
      const [l1, l2] = dominoLetters(piece, p.orientation);
      byId.set(p.dominoId, { cells: [c1, c2], letters: [l1, l2] });
      byCell.set(cellKey(c1.row, c1.col), p);
      byCell.set(cellKey(c2.row, c2.col), p);
    }
    return { byId, byCell };
  }, [state.placed, puzzle.dominoes]);
  const placedPairs = dominoIndex.byId;

  function isDominoInvalid(dId: number): boolean {
    const pair = placedPairs.get(dId);
    if (!pair) return false;
    return pair.cells.some((c) => invalidCells.has(cellKey(c.row, c.col)));
  }

  function dominoBridge(dId: number): "H" | "V" | null {
    const pair = placedPairs.get(dId);
    if (!pair) return null;
    const [c1, c2] = pair.cells;
    return c1.row === c2.row ? "H" : "V";
  }

  function isDominoPairCell(dId: number, r: number, c: number): 0 | 1 | -1 {
    const pair = placedPairs.get(dId);
    if (!pair) return -1;
    const k = cellKey(r, c);
    if (cellKey(pair.cells[0].row, pair.cells[0].col) === k) return 0;
    if (cellKey(pair.cells[1].row, pair.cells[1].col) === k) return 1;
    return -1;
  }

  const outlinePath = useMemo(
    () =>
      computeOutlinePath(
        puzzle.board.cells,
        cell,
        GAP,
        puzzle.board.rows,
        puzzle.board.cols,
        OUTLINE_PAD,
      ),
    [puzzle.board, cell],
  );

  const boardDragRef = useRef<{
    dominoId: number;
    orientation: Orientation;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);

  const gridW = puzzle.board.cols * (cell + GAP) - GAP;
  const gridH = puzzle.board.rows * (cell + GAP) - GAP;

  return (
    <div
      className="relative mx-auto select-none touch-manipulation"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${puzzle.board.cols}, ${cell}px)`,
        gridTemplateRows: `repeat(${puzzle.board.rows}, ${cell}px)`,
        gap: `${GAP}px`,
      }}
    >
      {outlinePath && (
        <svg
          className="absolute pointer-events-none"
          style={{ top: 0, left: 0, overflow: "visible" }}
          width={gridW}
          height={gridH}
        >
          <path
            d={outlinePath}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity={0.4}
          />
        </svg>
      )}

      {Array.from({ length: puzzle.board.rows * puzzle.board.cols }, (_, i) => {
        const row = Math.floor(i / puzzle.board.cols);
        const col = i % puzzle.board.cols;
        const k = cellKey(row, col);

        if (!boardCellSet.has(k)) {
          return <div key={k} />;
        }

        const letter = grid.get(k);
        const pd = dominoIndex.byCell.get(k) ?? null;

        const bridge = pd ? dominoBridge(pd.dominoId) : null;
        const pairIdx = pd ? isDominoPairCell(pd.dominoId, row, col) : -1;
        const domInvalid = pd ? isDominoInvalid(pd.dominoId) : false;

        let borderRadius = "0.5rem";
        if (bridge === "H" && pairIdx === 0) borderRadius = "0.5rem 0 0 0.5rem";
        if (bridge === "H" && pairIdx === 1) borderRadius = "0 0.5rem 0.5rem 0";
        if (bridge === "V" && pairIdx === 0) borderRadius = "0.5rem 0.5rem 0 0";
        if (bridge === "V" && pairIdx === 1) borderRadius = "0 0 0.5rem 0.5rem";

        const hasBridgeRight = bridge === "H" && pairIdx === 0;
        const hasBridgeDown = bridge === "V" && pairIdx === 0;

        const bColor = state.solved
          ? "var(--color-accent)"
          : domInvalid
            ? "var(--color-warn)"
            : "var(--color-line)";
        const full = `${BW}px solid ${bColor}`;

        let borderStyle: React.CSSProperties = {};
        if (pd) {
          let bT = full, bR = full, bB = full, bL = full;
          if (bridge === "H" && pairIdx === 0) bR = "0";
          if (bridge === "H" && pairIdx === 1) bL = "0";
          if (bridge === "V" && pairIdx === 0) bB = "0";
          if (bridge === "V" && pairIdx === 1) bT = "0";
          borderStyle = {
            borderTop: bT,
            borderRight: bR,
            borderBottom: bB,
            borderLeft: bL,
          };
        }

        const textClass = pd
          ? state.solved
            ? "text-accent"
            : domInvalid
              ? "text-warn"
              : "text-ink"
          : "text-ink-soft";

        const isPreview = previewCells && previewCells.keys.has(k);
        const isHover = !isPreview && hoverCell && hoverCell.row === row && hoverCell.col === col;

        let cellBg = "bg-surface-tint";
        if (pd) cellBg = "bg-surface";
        else if (isPreview) cellBg = previewCells.valid ? "bg-good/15" : "bg-warn/15";
        else if (isHover) cellBg = "bg-accent/15";

        return (
          <div key={k} className="relative" style={{ gridRow: row + 1, gridColumn: col + 1, zIndex: 1 }}>
            <motion.button
              data-cell={k}
              data-row={row}
              data-col={col}
              className={[
                "flex items-center justify-center font-game text-lg",
                "w-full h-full",
                cellBg,
                textClass,
              ].join(" ")}
              style={{
                borderRadius,
                ...borderStyle,
                ...(pd ? { boxShadow: "0 1px 3px rgba(0,0,0,0.08)" } : {}),
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                if (pd) {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  boardDragRef.current = {
                    dominoId: pd.dominoId,
                    orientation: pd.orientation,
                    startX: e.clientX,
                    startY: e.clientY,
                    dragging: false,
                  };
                }
              }}
              onPointerMove={(e) => {
                const ref = boardDragRef.current;
                if (!ref || ref.dragging) {
                  if (ref?.dragging) onBoardDragMove?.(e.clientX, e.clientY);
                  return;
                }
                const dx = e.clientX - ref.startX;
                const dy = e.clientY - ref.startY;
                if (dx * dx + dy * dy > BOARD_DRAG_THRESHOLD) {
                  ref.dragging = true;
                  onBoardDragStart?.(ref.dominoId, ref.orientation);
                  onBoardDragMove?.(e.clientX, e.clientY);
                }
              }}
              onPointerUp={(e) => {
                const ref = boardDragRef.current;
                if (ref) {
                  if (ref.dragging) {
                    onBoardDragEnd?.();
                  } else {
                    onTapPlaced?.(ref.dominoId);
                  }
                  boardDragRef.current = null;
                  try {
                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                  } catch { /* already released */ }
                } else {
                  onCellTap({ row, col });
                }
              }}
              aria-label={
                letter
                  ? `${letter} at row ${row + 1}, column ${col + 1}`
                  : `Empty cell row ${row + 1}, column ${col + 1}`
              }
            >
              {letter || ""}
            </motion.button>

            {hasBridgeRight && (
              <div
                className="absolute top-0 pointer-events-none flex items-center justify-center"
                style={{
                  right: `-${GAP}px`,
                  width: `${GAP}px`,
                  height: "100%",
                  backgroundColor: "var(--color-surface)",
                  borderTop: full,
                  borderBottom: full,
                }}
              >
                <div
                  style={{
                    width: "1px",
                    alignSelf: "stretch",
                    marginBlock: `${Math.round(cell * 0.15)}px`,
                    backgroundColor: bColor,
                    opacity: 0.35,
                  }}
                />
              </div>
            )}
            {hasBridgeDown && (
              <div
                className="absolute left-0 pointer-events-none flex items-center justify-center"
                style={{
                  bottom: `-${GAP}px`,
                  height: `${GAP}px`,
                  width: "100%",
                  backgroundColor: "var(--color-surface)",
                  borderLeft: full,
                  borderRight: full,
                }}
              >
                <div
                  style={{
                    height: "1px",
                    alignSelf: "stretch",
                    marginInline: `${Math.round(cell * 0.15)}px`,
                    backgroundColor: bColor,
                    opacity: 0.35,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getDir(from: [number, number], to: [number, number]): "R" | "D" | "L" | "U" {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (dx > 0) return "R";
  if (dx < 0) return "L";
  if (dy > 0) return "D";
  return "U";
}

function computeOutlinePath(
  boardCells: Cell[],
  cellSize: number,
  gap: number,
  rows: number,
  cols: number,
  offset: number,
): string {
  const stride = cellSize + gap;
  const cs = new Set(boardCells.map((c) => `${c.row},${c.col}`));

  const fineOcc = (fr: number, fc: number): boolean => {
    if (fr < 0 || fc < 0 || fr >= 2 * rows - 1 || fc >= 2 * cols - 1) return false;
    const re = fr % 2 === 0;
    const ce = fc % 2 === 0;
    if (re && ce) return cs.has(`${fr / 2},${fc / 2}`);
    if (re) return cs.has(`${fr / 2},${(fc - 1) / 2}`) && cs.has(`${fr / 2},${(fc + 1) / 2}`);
    if (ce) return cs.has(`${(fr - 1) / 2},${fc / 2}`) && cs.has(`${(fr + 1) / 2},${fc / 2}`);
    return (
      cs.has(`${(fr - 1) / 2},${(fc - 1) / 2}`) &&
      cs.has(`${(fr - 1) / 2},${(fc + 1) / 2}`) &&
      cs.has(`${(fr + 1) / 2},${(fc - 1) / 2}`) &&
      cs.has(`${(fr + 1) / 2},${(fc + 1) / 2}`)
    );
  };

  const fRect = (fr: number, fc: number) => ({
    x: fc % 2 === 0 ? (fc / 2) * stride : ((fc - 1) / 2) * stride + cellSize,
    y: fr % 2 === 0 ? (fr / 2) * stride : ((fr - 1) / 2) * stride + cellSize,
    w: fc % 2 === 0 ? cellSize : gap,
    h: fr % 2 === 0 ? cellSize : gap,
  });

  type V = [number, number];
  const edges: [V, V][] = [];

  for (let fr = 0; fr < 2 * rows - 1; fr++) {
    for (let fc = 0; fc < 2 * cols - 1; fc++) {
      if (!fineOcc(fr, fc)) continue;
      const { x, y, w, h } = fRect(fr, fc);
      if (!fineOcc(fr - 1, fc)) edges.push([[x, y], [x + w, y]]);
      if (!fineOcc(fr + 1, fc)) edges.push([[x + w, y + h], [x, y + h]]);
      if (!fineOcc(fr, fc - 1)) edges.push([[x, y + h], [x, y]]);
      if (!fineOcc(fr, fc + 1)) edges.push([[x + w, y], [x + w, y + h]]);
    }
  }

  if (!edges.length) return "";

  const vk = (v: V) => `${Math.round(v[0] * 100)},${Math.round(v[1] * 100)}`;
  const startMap = new Map<string, [V, V]>();
  for (const e of edges) startMap.set(vk(e[0]), e);

  const visited = new Set<string>();
  const paths: string[] = [];

  for (const e of edges) {
    const sk = vk(e[0]);
    if (visited.has(sk)) continue;

    const verts: V[] = [];
    let cur: [V, V] | undefined = e;
    while (cur && !visited.has(vk(cur[0]))) {
      visited.add(vk(cur[0]));
      verts.push(cur[0]);
      cur = startMap.get(vk(cur[1]));
    }

    if (verts.length < 3) continue;

    const n = verts.length;
    const offsetVerts: V[] = [];
    for (let i = 0; i < n; i++) {
      const prev = verts[(i - 1 + n) % n];
      const curr = verts[i];
      const next = verts[(i + 1) % n];

      const inDir = getDir(prev, curr);
      const outDir = getDir(curr, next);

      const dx = inDir === "D" || outDir === "D" ? offset : -offset;
      const dy = inDir === "R" || outDir === "R" ? -offset : offset;

      offsetVerts.push([curr[0] + dx, curr[1] + dy]);
    }

    paths.push(`M${offsetVerts.map((p) => `${p[0]} ${p[1]}`).join(" L")} Z`);
  }

  return paths.join(" ");
}
