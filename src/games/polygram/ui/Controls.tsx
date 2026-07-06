import { Shuffle } from "lucide-react";

interface Props {
  onDelete: () => void;
  onShuffle: () => void;
  onEnter: () => void;
}

/** Spelling-Bee-style controls: Delete, shuffle, Enter. */
export function Controls({ onDelete, onShuffle, onEnter }: Props) {
  const pill =
    "rounded-full border border-line px-6 py-3 text-sm font-semibold active:scale-95 select-none";
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        type="button"
        onClick={onDelete}
        className={pill}
        style={{ touchAction: "manipulation" }}
      >
        Delete
      </button>
      <button
        type="button"
        onClick={onShuffle}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-line active:scale-95"
        style={{ touchAction: "manipulation" }}
        aria-label="shuffle letters"
      >
        <Shuffle aria-hidden className="h-4.5 w-4.5" />
      </button>
      <button
        type="button"
        onClick={onEnter}
        className={pill}
        style={{ touchAction: "manipulation" }}
      >
        Enter
      </button>
    </div>
  );
}
