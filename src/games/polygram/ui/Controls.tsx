interface Props {
  onDelete: () => void;
  onHint: () => void;
  onEnter: () => void;
}

/** Spelling-Bee-style pill controls under the board. */
export function Controls({ onDelete, onHint, onEnter }: Props) {
  const pill =
    "rounded-full border border-line px-6 py-3 text-sm font-semibold active:scale-95 select-none";
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        type="button"
        onPointerDown={onDelete}
        className={pill}
        style={{ touchAction: "manipulation" }}
      >
        Delete
      </button>
      <button
        type="button"
        onPointerDown={onHint}
        className={`${pill} text-accent`}
        style={{ touchAction: "manipulation" }}
      >
        Hint
      </button>
      <button
        type="button"
        onPointerDown={onEnter}
        className={pill}
        style={{ touchAction: "manipulation" }}
      >
        Enter
      </button>
    </div>
  );
}
