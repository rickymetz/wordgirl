interface Props {
  onDelete: () => void;
  onShuffle: () => void;
  onEnter: () => void;
}

/** Spelling-Bee-style controls: Delete, shuffle (round icon), Enter. */
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 12a8 8 0 0 1 13.6-5.7M20 12a8 8 0 0 1-13.6 5.7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M17.6 2.5v3.8h-3.8M6.4 21.5v-3.8h3.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
