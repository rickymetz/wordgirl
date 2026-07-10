import { motion } from "motion/react";
import { useViewport } from "../../../lib/useViewport";
import type { GameState } from "../state/reducer";
import { dominoAt } from "../state/reducer";
import {
  cellKey,
  dominoCells,
  dominoLetters,
  type Cell,
} from "../engine/types";

const GAP = 6;
const BW = 2;
const MAX_CELL = 56;
const MIN_CELL = 32;
const CHROME_H = 360;

interface Props {
  state: GameState;
  onCellTap: (cell: Cell) => void;
}

export function Board({ state, onCellTap }: Props) {
  const { puzzle, grid, invalidSlots } = state;
  const { vw, vh, rem } = useViewport();

  const wCell =
    (Math.min(360, vw - 32) - (puzzle.board.cols - 1) * GAP) / puzzle.board.cols;
  const hCell =
    (vh - CHROME_H * (rem / 16) - (puzzle.board.rows - 1) * GAP) /
    puzzle.board.rows;
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, wCell, hCell));

  const boardCellSet = new Set(
    puzzle.board.cells.map((c) => cellKey(c.row, c.col)),
  );

  const invalidCells = new Set<string>();
  for (const si of invalidSlots) {
    for (const c of puzzle.slots[si].cells) {
      invalidCells.add(cellKey(c.row, c.col));
    }
  }

  const placedPairs = new Map<number, { cells: [Cell, Cell]; letters: [string, string] }>();
  for (const p of state.placed) {
    const piece = puzzle.dominoes.find((d) => d.id === p.dominoId);
    if (!piece) continue;
    const [c1, c2] = dominoCells(p.anchor, p.orientation);
    const [l1, l2] = dominoLetters(piece, p.orientation);
    placedPairs.set(p.dominoId, { cells: [c1, c2], letters: [l1, l2] });
  }

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
      {Array.from({ length: puzzle.board.rows * puzzle.board.cols }, (_, i) => {
        const row = Math.floor(i / puzzle.board.cols);
        const col = i % puzzle.board.cols;
        const k = cellKey(row, col);

        if (!boardCellSet.has(k)) {
          return <div key={k} />;
        }

        const letter = grid.get(k);
        const pd = dominoAt(state, row, col);

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

        return (
          <div key={k} className="relative" style={{ gridRow: row + 1, gridColumn: col + 1 }}>
            <motion.button
              className={[
                "flex items-center justify-center font-game text-lg",
                "w-full h-full",
                pd ? "bg-surface" : "bg-surface-tint",
                textClass,
              ].join(" ")}
              style={{
                borderRadius,
                ...borderStyle,
                ...(pd ? { boxShadow: "0 1px 3px rgba(0,0,0,0.08)" } : {}),
              }}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onCellTap({ row, col })}
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
