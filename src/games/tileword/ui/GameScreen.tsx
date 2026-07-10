import "@fontsource/rubik-mono-one/latin-400.css";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, RotateCcw } from "lucide-react";
import { formatDuration } from "../../../lib/date";
import { HomeLink } from "../../../components/HomeLink";
import { ModalDialog } from "../../../components/ModalDialog";
import { useTilewordGame, type GameMode } from "../state/useTilewordGame";
import { placedDominoIds } from "../state/reducer";
import type { Cell, Difficulty, Orientation } from "../engine/types";
import { dominoCells, dominoLetters, cellKey } from "../engine/types";
import { Board } from "./Board";
import { DominoTray } from "./DominoTray";

const DIFF_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

interface DragState {
  dominoId: number;
  orientation: Orientation;
  x: number;
  y: number;
  originRect: DOMRect;
}

interface Props {
  mode: GameMode;
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
}

export function GameScreen({ mode, difficulty, onDifficultyChange }: Props) {
  const { state, dispatch, puzzle, dict, solvedElapsedMs } =
    useTilewordGame(mode);

  const [resultsOpen, setResultsOpen] = useState(true);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverCell, setHoverCell] = useState<Cell | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const placed = placedDominoIds(state);
  const totalDominoes = puzzle.dominoes.length;
  const placedCount = placed.size;
  const boardCellSet = useRef(new Set<string>());

  boardCellSet.current = new Set(
    puzzle.board.cells.map((c) => cellKey(c.row, c.col)),
  );

  const handleCellTap = (cell: Cell) => {
    if (state.solved) return;

    if (state.selectedDominoId !== null) {
      const anchor = findValidAnchor(cell, state.currentOrientation);
      if (anchor) {
        dispatch({ type: "placeDomino", cell: anchor, dict });
      } else {
        setShakeKey((k) => k + 1);
      }
    }
  };

  const handleTapPlaced = useCallback(
    (dominoId: number) => {
      if (state.solved) return;
      dispatch({ type: "rotatePlaced", dominoId, dict });
    },
    [state.solved, dict, dispatch],
  );

  const handleBoardDragStart = useCallback(
    (dominoId: number, orientation: Orientation) => {
      dispatch({ type: "removeDomino", dominoId });
      setDrag({
        dominoId,
        orientation,
        x: 0,
        y: 0,
        originRect: new DOMRect(),
      });
    },
    [dispatch],
  );

  const handleBoardDragMove = useCallback(
    (x: number, y: number) => {
      setDrag((prev) => (prev ? { ...prev, x, y } : null));
      const cell = cellFromPoint(x, y);
      setHoverCell(cell);
    },
    [],
  );

  function cellFromPoint(x: number, y: number): Cell | null {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      const btn = el.closest("[data-cell]") as HTMLElement | null;
      if (btn) {
        const row = Number(btn.dataset.row);
        const col = Number(btn.dataset.col);
        if (!isNaN(row) && !isNaN(col)) return { row, col };
      }
    }
    return null;
  }

  function canPlace(cell: Cell, orientation: Orientation): boolean {
    const [c1, c2] = dominoCells(cell, orientation);
    if (
      !boardCellSet.current.has(cellKey(c1.row, c1.col)) ||
      !boardCellSet.current.has(cellKey(c2.row, c2.col))
    )
      return false;
    if (
      state.grid.has(cellKey(c1.row, c1.col)) ||
      state.grid.has(cellKey(c2.row, c2.col))
    )
      return false;
    return true;
  }

  function findValidAnchor(target: Cell, orientation: Orientation): Cell | null {
    if (canPlace(target, orientation)) return target;
    const isH = orientation === 0 || orientation === 2;
    const reverse: Cell = isH
      ? { row: target.row, col: target.col - 1 }
      : { row: target.row - 1, col: target.col };
    if (canPlace(reverse, orientation)) return reverse;
    return null;
  }

  const handleDragStart = useCallback(
    (id: number, orientation: Orientation, rect: DOMRect) => {
      setDrag({
        dominoId: id,
        orientation,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        originRect: rect,
      });
    },
    [],
  );

  const handleDragMove = useCallback(
    (x: number, y: number) => {
      setDrag((prev) => (prev ? { ...prev, x, y } : null));
      const cell = cellFromPoint(x, y);
      setHoverCell(cell);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    if (!drag) {
      setDrag(null);
      setHoverCell(null);
      return;
    }

    const cell = cellFromPoint(drag.x, drag.y);
    if (cell) {
      const anchor = findValidAnchor(cell, drag.orientation);
      if (anchor) {
        dispatch({
          type: "placeDomino",
          cell: anchor,
          dict,
          dominoId: drag.dominoId,
          orientation: drag.orientation,
        });
      } else {
        setShakeKey((k) => k + 1);
      }
    }

    setDrag(null);
    setHoverCell(null);
  }, [drag, dict, dispatch]);

  const dragPiece = drag
    ? puzzle.dominoes.find((d) => d.id === drag.dominoId)
    : null;

  const previewOri: Orientation | null = drag
    ? drag.orientation
    : state.selectedDominoId !== null
      ? state.currentOrientation
      : null;
  const resolvedAnchor =
    hoverCell && previewOri !== null
      ? findValidAnchor(hoverCell, previewOri)
      : null;

  return (
    <div
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-6 [@media(max-height:720px)]:pb-3"
      data-level="tileword"
    >
      {/* Header */}
      <header className="flex items-center justify-between pt-6 pb-2 [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-1">
        <HomeLink />
        <div className="w-6" />
      </header>

      {/* Title + difficulty */}
      <div className="flex items-baseline gap-2.5 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Tileword</h1>
        <span className="text-base font-semibold text-ink-soft">
          {placedCount}/{totalDominoes} placed
        </span>
      </div>

      {/* Difficulty tabs */}
      <div className="flex gap-1 pb-3">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <button
            key={d}
            className={[
              "px-4 py-1.5 rounded-full text-sm font-semibold",
              "touch-manipulation select-none transition-colors",
              d === difficulty
                ? "bg-accent text-surface"
                : "bg-surface-tint text-ink-soft",
            ].join(" ")}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onDifficultyChange(d)}
          >
            {DIFF_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Board — centered in remaining space */}
      <div className="flex flex-1 flex-col items-center justify-center py-4 [@media(max-height:720px)]:py-2">
        <motion.div
          key={shakeKey}
          animate={shakeKey > 0 ? { x: [0, -4, 4, -3, 3, 0] } : {}}
          transition={{ duration: 0.35 }}
        >
          <Board
            state={state}
            onCellTap={handleCellTap}
            onTapPlaced={handleTapPlaced}
            onBoardDragStart={handleBoardDragStart}
            onBoardDragMove={handleBoardDragMove}
            onBoardDragEnd={handleDragEnd}
            hoverCell={hoverCell}
            resolvedAnchor={resolvedAnchor}
            previewOrientation={previewOri}
          />
        </motion.div>
      </div>

      {/* Tray — pinned to bottom */}
      <div className="flex flex-col items-center gap-2">
        {placedCount > 0 && !state.solved && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-surface-tint text-ink-soft text-sm font-semibold
                       active:scale-95 touch-manipulation select-none"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => dispatch({ type: "clearBoard" })}
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        )}
        <DominoTray
          state={state}
          onSelect={(id) => dispatch({ type: "selectDomino", dominoId: id })}
          onRotate={() => dispatch({ type: "rotateDomino" })}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          draggedId={drag?.dominoId ?? null}
        />
      </div>

      {/* Drag ghost */}
      {drag && dragPiece && (
        <DragGhost drag={drag} piece={dragPiece} />
      )}

      {/* Solved overlay */}
      <AnimatePresence>
        {state.solved && resultsOpen && (
          <ModalDialog
            labelledBy="tileword-result"
            onClose={() => setResultsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center gap-4 p-6"
              data-autofocus
              tabIndex={-1}
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-good/20">
                <Check className="h-8 w-8 text-good" />
              </div>
              <h2
                id="tileword-result"
                className="text-xl font-bold text-ink"
              >
                Solved
              </h2>
              {solvedElapsedMs !== null && (
                <p className="text-ink-soft text-sm">
                  {formatDuration(solvedElapsedMs)}
                </p>
              )}
              <button
                className="px-6 py-2 rounded-full bg-accent text-surface
                           font-semibold touch-manipulation select-none
                           active:scale-95"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setResultsOpen(false)}
              >
                Done
              </button>
            </motion.div>
          </ModalDialog>
        )}
      </AnimatePresence>
    </div>
  );
}

function DragGhost({
  drag,
  piece,
}: {
  drag: DragState;
  piece: { id: number; letters: [string, string] };
}) {
  const isH = drag.orientation === 0 || drag.orientation === 2;
  const [l0, l1] = dominoLetters(piece as any, drag.orientation);

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: drag.x,
        top: drag.y,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="flex items-center justify-center rounded-xl border-2 border-accent bg-surface shadow-lg shadow-accent/25"
        style={{ flexDirection: isH ? "row" : "column" }}
      >
        <div className="flex items-center justify-center font-game text-base w-10 h-10 text-ink">
          {l0}
        </div>
        <div
          className="bg-accent/30"
          style={
            isH
              ? { width: "1px", alignSelf: "stretch", marginBlock: "6px" }
              : { height: "1px", alignSelf: "stretch", marginInline: "6px" }
          }
        />
        <div className="flex items-center justify-center font-game text-base w-10 h-10 text-ink">
          {l1}
        </div>
      </div>
    </div>
  );
}
