import "@fontsource/rubik-mono-one/latin-400.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleHelp, Lightbulb, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDateKey, formatDuration, formatShareDate } from "../../../lib/date";
import { SHARE_URL } from "../../../lib/share";
import { ShareButton } from "../../../components/ShareButton";
import { HomeLink } from "../../../components/HomeLink";
import { useDoubletGame, type GameMode } from "../state/useDoubletGame";
import { placedDominoIds } from "../state/reducer";
import type { Cell, Difficulty, Orientation } from "../engine/types";
import { dominoCells, dominoLetters, cellKey } from "../engine/types";
import { Board } from "./Board";
import { DominoTray } from "./DominoTray";
import { ConfettiOverlay } from "../../../components/ConfettiOverlay";
import { useSolveTransition } from "../../../lib/useSolveTransition";
import { DoubletCoach } from "./Overlays";
import { loadCoachSeen, markCoachSeen } from "../state/persistence";

const DIFF_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

function buildShareText(
  difficulty: Difficulty,
  dateKey: string,
  elapsedMs: number,
  hints: number,
): string {
  const hintPart = hints > 0 ? ` · 🫣 ${hints}` : " · 🤓";
  return [
    `Doublet — ${formatShareDate(dateKey)}`,
    `${DIFF_LABELS[difficulty]} · ⏱️ ${formatDuration(elapsedMs)}${hintPart}`,
    SHARE_URL,
  ].join("\n");
}

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
  const { state, dispatch, puzzle, dict, solvedElapsedMs, hydratedAsSolved } =
    useDoubletGame(mode);

  const { showConfetti, showResults } = useSolveTransition(state.solved, hydratedAsSolved);

  const [coachOpen, setCoachOpen] = useState(false);
  useEffect(() => {
    void loadCoachSeen().then((seen) => {
      if (!seen) setCoachOpen(true);
    });
  }, []);
  const closeCoach = () => {
    setCoachOpen(false);
    void markCoachSeen();
  };

  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverCell, setHoverCell] = useState<Cell | null>(null);
  const placed = placedDominoIds(state);
  const totalDominoes = puzzle.dominoes.length;
  const placedCount = placed.size;
  const boardCellSet = useRef(new Set<string>());
  const gridRef = useRef(state.grid);
  gridRef.current = state.grid;

  const bottomRef = useRef<HTMLDivElement>(null);
  const frozenBottomH = useRef(0);
  useEffect(() => {
    if (!state.solved && bottomRef.current) {
      frozenBottomH.current = bottomRef.current.getBoundingClientRect().height;
    }
  }, [state.solved, placedCount]);

  boardCellSet.current = new Set(
    puzzle.board.cells.map((c) => cellKey(c.row, c.col)),
  );

  const handleCellTap = (cell: Cell) => {
    if (state.solved) return;

    if (state.selectedDominoId !== null) {
      const anchor = findValidAnchor(cell, state.currentOrientation);
      if (anchor) {
        dispatch({ type: "placeDomino", cell: anchor, dict });
      }
    }
  };

  const handleTapPlaced = useCallback(
    (dominoId: number) => {
      if (state.solved) return;
      dispatch({ type: "removeDomino", dominoId });
    },
    [state.solved, dispatch],
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
      gridRef.current.has(cellKey(c1.row, c1.col)) ||
      gridRef.current.has(cellKey(c2.row, c2.col))
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

  const lastHoverRef = useRef<string | null>(null);
  const handleDragMove = useCallback(
    (x: number, y: number) => {
      setDrag((prev) => (prev ? { ...prev, x, y } : null));
      const cell = cellFromPoint(x, y);
      const k = cell ? cellKey(cell.row, cell.col) : null;
      if (k !== lastHoverRef.current) {
        lastHoverRef.current = k;
        setHoverCell(cell);
      }
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
      }
    }

    setDrag(null);
    setHoverCell(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      data-level="doublet"
    >
      {/* Header */}
      <header className="flex items-center justify-between pt-6 pb-2 [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-1">
        {mode.kind === "archive" ? (
          <Link
            to="/games/doublet/archive"
            className="text-sm font-semibold text-ink-soft"
          >
            ← Archive
          </Link>
        ) : (
          <HomeLink />
        )}
        <span className="flex items-center gap-2">
          {!state.solved && (
            <button
              className="relative flex items-center gap-1 px-2.5 py-1 rounded-full
                         text-ink-soft text-xs font-semibold
                         active:scale-95 touch-manipulation select-none
                         after:absolute after:inset-x-0 after:-inset-y-2.5"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => dispatch({ type: "revealHint", dict })}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Hint{state.hints > 0 ? ` (${state.hints})` : ""}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCoachOpen(true)}
            aria-label="how to play"
            className="-m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90"
          >
            <CircleHelp aria-hidden className="h-5 w-5" />
          </button>
        </span>
      </header>

      {/* Title + difficulty */}
      <div className="flex items-baseline gap-2.5 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Doublet</h1>
        <svg role="img" aria-label="doublet" width="20" height="20" viewBox="0 0 20 20"
          className="shrink-0 self-center text-accent">
          <rect x="1" y="5" width="8" height="10" rx="2" fill="none"
            stroke="currentColor" strokeWidth="2" />
          <rect x="11" y="5" width="8" height="10" rx="2" fill="none"
            stroke="currentColor" strokeWidth="2" />
        </svg>
        {mode.kind === "archive" && (
          <span className="text-base font-semibold text-ink-soft">
            {formatDateKey(mode.dateKey)}
          </span>
        )}
      </div>

      {/* Difficulty tabs */}
      <div className="flex gap-1 pb-3">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <button
            key={d}
            className={[
              "relative px-4 py-1.5 rounded-full text-sm font-semibold",
              "touch-manipulation select-none transition-colors",
              "after:absolute after:inset-x-0 after:-inset-y-1.5",
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
        <Board
          state={state}
          onCellTap={handleCellTap}
          onTapPlaced={handleTapPlaced}
          onBoardDragStart={handleBoardDragStart}
          onBoardDragMove={handleDragMove}
          onBoardDragEnd={handleDragEnd}
          hoverCell={hoverCell}
          resolvedAnchor={resolvedAnchor}
          previewOrientation={previewOri}
        />
      </div>

      {/* Bottom area: tray during play, results after solve */}
      <div
        ref={bottomRef}
        style={state.solved ? { minHeight: frozenBottomH.current } : undefined}
      >
        <AnimatePresence mode="wait">
          {state.solved && showResults ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3 pb-2"
            >
              <p className="text-lg font-bold text-ink">Solved</p>
              {solvedElapsedMs !== null && (
                <p className="text-sm text-ink-soft">
                  {formatDuration(solvedElapsedMs)}
                </p>
              )}
              {mode.kind !== "practice" && solvedElapsedMs !== null && (
                <ShareButton
                  text={buildShareText(difficulty, mode.dateKey, solvedElapsedMs, state.hints)}
                  gameId="doublet"
                />
              )}
            </motion.div>
          ) : !state.solved ? (
          <motion.div
            key="controls"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex items-center justify-center gap-3 pb-3">
              <span className="text-sm font-medium text-ink-soft">
                {placedCount}/{totalDominoes} placed
              </span>
              {placedCount > 0 && (
                <button
                  className="relative flex items-center gap-1 px-2.5 py-1 rounded-full
                             text-ink-soft text-xs font-semibold
                             active:scale-95 touch-manipulation select-none
                             after:absolute after:inset-x-0 after:-inset-y-2.5"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => dispatch({ type: "clearBoard" })}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
            <DominoTray
              state={state}
              onSelect={(id) => dispatch({ type: "selectDomino", dominoId: id })}
              onRotate={() => dispatch({ type: "rotateDomino" })}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              draggedId={drag?.dominoId ?? null}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>

      {/* Drag ghost */}
      {drag && dragPiece && (
        <DragGhost drag={drag} piece={dragPiece} />
      )}

      {/* Confetti burst on solve */}
      {showConfetti && <ConfettiOverlay />}

      {/* Coach */}
      <DoubletCoach open={coachOpen} onClose={closeCoach} />

      {/* Accessibility */}
      <div aria-live="polite" role="status" className="sr-only">
        {state.solved && <span>Solved</span>}
      </div>
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
