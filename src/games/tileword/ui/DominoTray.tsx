import React from "react";
import { motion } from "motion/react";
import type { DominoPiece, Orientation } from "../engine/types";
import { placedDominoIds, type GameState } from "../state/reducer";

interface Props {
  state: GameState;
  onSelect: (id: number) => void;
  onRotate: () => void;
  onDragStart?: (id: number, orientation: Orientation, rect: DOMRect) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: () => void;
  draggedId?: number | null;
}

export function DominoTray({ state, onSelect, onRotate, onDragStart, onDragMove, onDragEnd, draggedId }: Props) {
  const { puzzle, selectedDominoId, currentOrientation } = state;
  const placed = placedDominoIds(state);
  const available = puzzle.dominoes.filter((d) => !placed.has(d.id));

  if (available.length === 0 && state.solved) return null;

  return (
    <div className="w-full px-4">
      <div className="flex flex-wrap justify-center gap-3">
        {available.map((d) => (
          <DominoChip
            key={d.id}
            piece={d}
            selected={d.id === selectedDominoId}
            orientation={d.id === selectedDominoId ? currentOrientation : 0}
            onSelect={() => onSelect(d.id)}
            onRotate={onRotate}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            dimmed={draggedId !== null && draggedId !== undefined && draggedId === d.id}
          />
        ))}
      </div>
    </div>
  );
}

const DRAG_THRESHOLD = 8;

const CHIP_W = "calc(5rem + 5px)";
const CHIP_H = "calc(2.5rem + 4px)";
const SPRING = { type: "spring" as const, stiffness: 500, damping: 30 };

function DominoChip({
  piece,
  selected,
  orientation,
  onSelect,
  onRotate,
  onDragStart,
  onDragMove,
  onDragEnd,
  dimmed,
}: {
  piece: DominoPiece;
  selected: boolean;
  orientation: Orientation;
  onSelect: () => void;
  onRotate: () => void;
  onDragStart?: (id: number, orientation: Orientation, rect: DOMRect) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: () => void;
  dimmed?: boolean;
}) {
  const isH = orientation === 0 || orientation === 2;
  const rotation = (orientation as number) * 90;

  const dragging = React.useRef(false);
  const startPt = React.useRef({ x: 0, y: 0 });

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startPt.current = { x: e.clientX, y: e.clientY };
    dragging.current = false;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) {
      const dx = e.clientX - startPt.current.x;
      const dy = e.clientY - startPt.current.y;
      if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
        dragging.current = true;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onDragStart?.(piece.id, orientation, rect);
      }
    }
    if (dragging.current) {
      onDragMove?.(e.clientX, e.clientY);
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (dragging.current) {
      dragging.current = false;
      onDragEnd?.();
    } else {
      if (selected) onRotate();
      else onSelect();
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  }

  return (
    <motion.div
      layout
      className="flex items-center justify-center"
      style={{
        width: isH ? CHIP_W : CHIP_H,
        height: isH ? CHIP_H : CHIP_W,
      }}
    >
      <motion.button
        animate={{ rotate: rotation }}
        transition={SPRING}
        className={[
          "flex items-center justify-center touch-manipulation select-none",
          "rounded-xl border-2 bg-surface",
          "transition-shadow",
          selected
            ? "border-accent shadow-md shadow-accent/20"
            : "border-line shadow-sm",
          dimmed ? "opacity-30" : "",
        ].join(" ")}
        style={{ flexDirection: "row" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label={`Domino ${piece.letters[0]}-${piece.letters[1]}${selected ? ", selected" : ""}`}
        aria-pressed={selected}
      >
        <motion.div
          animate={{ rotate: -rotation }}
          transition={SPRING}
          className="flex items-center justify-center font-game text-base w-10 h-10 text-ink"
        >
          {piece.letters[0]}
        </motion.div>
        <div
          className={selected ? "bg-accent/30" : "bg-line"}
          style={{ width: "1px", alignSelf: "stretch", marginBlock: "6px" }}
        />
        <motion.div
          animate={{ rotate: -rotation }}
          transition={SPRING}
          className="flex items-center justify-center font-game text-base w-10 h-10 text-ink"
        >
          {piece.letters[1]}
        </motion.div>
      </motion.button>
    </motion.div>
  );
}
