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

const CHIP_H = 44; // horizontal chip height: border-2 (4px) + h-10 (40px)
const CHIP_V = 85; // vertical chip height: border-2 (4px) + h-10×2 (80px) + 1px divider
const GAP = 8; // gap-2
const CHIPS_PER_ROW = 3;
const V_OVERFLOW = (CHIP_V - CHIP_H) / 2; // 20.5px visual overshoot when rotated

const ROTATIONS: Record<Orientation, string | undefined> = { 0: undefined, 1: "90deg", 2: "180deg", 3: "-90deg" };
const COUNTER_ROTATIONS: Record<Orientation, string | undefined> = { 0: undefined, 1: "-90deg", 2: "180deg", 3: "90deg" };

export function DominoTray({ state, onSelect, onRotate, onDragStart, onDragMove, onDragEnd, draggedId }: Props) {
  const { puzzle, selectedDominoId, currentOrientation } = state;
  const placed = placedDominoIds(state);
  const available = puzzle.dominoes.filter((d) => !placed.has(d.id));

  if (available.length === 0 && state.solved) return null;

  const totalRows = Math.ceil(puzzle.dominoes.length / CHIPS_PER_ROW);
  const trayMinH = totalRows * CHIP_H + Math.max(0, totalRows - 1) * GAP + 2 * V_OVERFLOW;

  return (
    <div className="w-full px-4">
      <div className="flex flex-wrap items-center justify-center gap-2" style={{ minHeight: trayMinH, paddingBlock: V_OVERFLOW }}>
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
  const rot = ROTATIONS[orientation];
  const counterRot = COUNTER_ROTATIONS[orientation];

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
    <button
      className={[
        "relative flex items-center justify-center touch-manipulation select-none",
        "rounded-lg border-2 bg-surface",
        "transition-shadow duration-100",
        "active:scale-95",
        selected
          ? "border-accent shadow-md shadow-accent/20"
          : "border-line shadow-sm",
        dimmed ? "opacity-30" : "",
      ].join(" ")}
      style={{
        rotate: rot,
        zIndex: rot && selected ? 1 : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      aria-label={`Domino ${piece.letters[0]}-${piece.letters[1]}${selected ? ", selected" : ""}`}
      aria-pressed={selected}
    >
      <div className="flex items-center justify-center font-game text-base w-10 h-10 text-ink"
        style={{ rotate: counterRot }}>
        {piece.letters[0]}
      </div>
      <div
        className={selected ? "bg-accent/30" : "bg-line"}
        style={{ width: "1px", alignSelf: "stretch", marginBlock: "6px" }}
      />
      <div className="flex items-center justify-center font-game text-base w-10 h-10 text-ink"
        style={{ rotate: counterRot }}>
        {piece.letters[1]}
      </div>
    </button>
  );
}
