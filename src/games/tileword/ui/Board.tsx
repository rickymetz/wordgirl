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

const GAP = 4;
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
        const isInvalid = invalidCells.has(k);

        const bridge = pd ? dominoBridge(pd.dominoId) : null;
        const pairIdx = pd ? isDominoPairCell(pd.dominoId, row, col) : -1;

        let borderRadius = "0.375rem";
        if (bridge === "H" && pairIdx === 0) borderRadius = "0.375rem 0 0 0.375rem";
        if (bridge === "H" && pairIdx === 1) borderRadius = "0 0.375rem 0.375rem 0";
        if (bridge === "V" && pairIdx === 0) borderRadius = "0.375rem 0.375rem 0 0";
        if (bridge === "V" && pairIdx === 1) borderRadius = "0 0 0.375rem 0.375rem";

        const hasBridgeRight =
          bridge === "H" && pairIdx === 0;
        const hasBridgeDown =
          bridge === "V" && pairIdx === 0;

        return (
          <div key={k} className="relative" style={{ gridRow: row + 1, gridColumn: col + 1 }}>
            <motion.button
              className={[
                "flex items-center justify-center font-game text-lg",
                "w-full h-full",
                letter
                  ? isInvalid
                    ? "bg-warn/20 text-warn"
                    : "bg-accent text-surface"
                  : "bg-surface-tint text-ink-soft",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ borderRadius }}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                if (pd && !state.solved) {
                  // remove this domino
                  return onCellTap({ row, col });
                }
                onCellTap({ row, col });
              }}
              aria-label={
                letter ? `${letter} at row ${row + 1}, column ${col + 1}` : `Empty cell row ${row + 1}, column ${col + 1}`
              }
            >
              {letter || ""}
            </motion.button>

            {hasBridgeRight && (
              <div
                className={[
                  "absolute top-0 h-full pointer-events-none",
                  isInvalid ? "bg-warn/20" : "bg-accent",
                ].join(" ")}
                style={{
                  right: `-${GAP}px`,
                  width: `${GAP}px`,
                }}
              />
            )}
            {hasBridgeDown && (
              <div
                className={[
                  "absolute left-0 w-full pointer-events-none",
                  isInvalid ? "bg-warn/20" : "bg-accent",
                ].join(" ")}
                style={{
                  bottom: `-${GAP}px`,
                  height: `${GAP}px`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
