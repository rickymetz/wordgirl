interface Props {
  onDelete: () => void;
  onShuffle: () => void;
  onEnter: () => void;
  /** Opens the words panel (where the hint lives). */
  onHint: () => void;
  /** Glow the bulb after repeated misses. */
  hintNudge: boolean;
}

/** Spelling-Bee-style controls: Delete, hint, shuffle, Enter. */
export function Controls({
  onDelete,
  onShuffle,
  onEnter,
  onHint,
  hintNudge,
}: Props) {
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
        onClick={onHint}
        className={`flex h-12 w-12 items-center justify-center rounded-full border border-line active:scale-95 ${
          hintNudge ? "animate-pulse border-accent text-accent" : ""
        }`}
        style={{ touchAction: "manipulation" }}
        aria-label="open hints"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.7.5 1.1 1.2 1.3 2.1h4.4c.2-.9.6-1.6 1.3-2.1A6 6 0 0 0 12 3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
