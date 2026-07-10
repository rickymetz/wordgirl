import { motion } from "motion/react";
import { RotateCw } from "lucide-react";
import type { DominoPiece, Orientation } from "../engine/types";
import { placedDominoIds, type GameState } from "../state/reducer";

interface Props {
  state: GameState;
  onSelect: (id: number) => void;
  onRotate: () => void;
}

export function DominoTray({ state, onSelect, onRotate }: Props) {
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
          />
        ))}
      </div>
      {selectedDominoId !== null && (
        <div className="flex justify-center mt-3">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-surface-tint text-accent text-sm font-semibold
                       active:scale-95 touch-manipulation select-none"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onRotate}
          >
            <RotateCw className="h-4 w-4" />
            Rotate
          </button>
        </div>
      )}
    </div>
  );
}

function DominoChip({
  piece,
  selected,
  orientation,
  onSelect,
  onRotate,
}: {
  piece: DominoPiece;
  selected: boolean;
  orientation: Orientation;
  onSelect: () => void;
  onRotate: () => void;
}) {
  const isH = orientation === 0 || orientation === 2;
  const flipped = orientation >= 2;
  const [l0, l1] = flipped
    ? [piece.letters[1], piece.letters[0]]
    : [piece.letters[0], piece.letters[1]];

  return (
    <motion.button
      layout
      className={[
        "flex items-center justify-center touch-manipulation select-none",
        "rounded-xl border-2 bg-surface",
        "transition-shadow",
        selected
          ? "border-accent shadow-md shadow-accent/20"
          : "border-line shadow-sm",
      ].join(" ")}
      style={{ flexDirection: isH ? "row" : "column" }}
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => {
        if (selected) onRotate();
        else onSelect();
      }}
      aria-label={`Domino ${piece.letters[0]}-${piece.letters[1]}${selected ? ", selected" : ""}`}
      aria-pressed={selected}
    >
      <div className="flex items-center justify-center font-game text-base w-10 h-10 text-ink">
        {l0}
      </div>
      <div
        className={selected ? "bg-accent/30" : "bg-line"}
        style={
          isH
            ? { width: "1px", alignSelf: "stretch", marginBlock: "6px" }
            : { height: "1px", alignSelf: "stretch", marginInline: "6px" }
        }
      />
      <div className="flex items-center justify-center font-game text-base w-10 h-10 text-ink">
        {l1}
      </div>
    </motion.button>
  );
}
