import React from "react";
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
      <div className="flex flex-wrap justify-center gap-1.5">
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
const CHIP_SLOT = "calc(4rem + 5px)";

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
  const flipped = orientation >= 2;
  const l0 = flipped ? piece.letters[1] : piece.letters[0];
  const l1 = flipped ? piece.letters[0] : piece.letters[1];

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

  function handlePointerCancel(e: React.PointerEvent<HTMLButtonElement>) {
    if (dragging.current) {
      dragging.current = false;
      onDragEnd?.();
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{ width: CHIP_SLOT, height: CHIP_SLOT }}
    >
      <button
        className={[
          "flex items-center justify-center touch-manipulation select-none",
          "rounded-xl border-2 bg-surface",
          "transition-shadow duration-100",
          "active:scale-95",
          selected
            ? "border-accent shadow-md shadow-accent/20"
            : "border-line shadow-sm",
          dimmed ? "opacity-30" : "",
        ].join(" ")}
        style={{ flexDirection: isH ? "row" : "column" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label={`Domino ${piece.letters[0]}-${piece.letters[1]}${selected ? ", selected" : ""}`}
        aria-pressed={selected}
      >
        <div className="flex items-center justify-center font-game text-sm w-8 h-8 text-ink">
          {l0}
        </div>
        <div
          className={selected ? "bg-accent/30" : "bg-line"}
          style={
            isH
              ? { width: "1px", alignSelf: "stretch", marginBlock: "5px" }
              : { height: "1px", alignSelf: "stretch", marginInline: "5px" }
          }
        />
        <div className="flex items-center justify-center font-game text-sm w-8 h-8 text-ink">
          {l1}
        </div>
      </button>
    </div>
  );
}
