const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

/** On-screen keyboard — the game is free typing, so it needs all 26. */
export function Keyboard({
  onLetter,
  onBackspace,
  onEnter,
  submitReady,
}: {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  /** Grid is fully filled — light Enter up as the obvious next tap. */
  submitReady: boolean;
}) {
  const base =
    "flex h-12 items-center justify-center rounded-lg font-semibold uppercase [@media(max-height:720px)]:h-10";
  const key = `${base} bg-tile active:bg-accent-soft`;
  return (
    <div className="flex w-full max-w-md flex-col gap-1.5">
      <div className="flex gap-1.5">
        {[...ROWS[0]].map((l) => (
          <button key={l} type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => onLetter(l)} className={`${key} flex-1 text-sm`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 px-4">
        {[...ROWS[1]].map((l) => (
          <button key={l} type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => onLetter(l)} className={`${key} flex-1 text-sm`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={onEnter}
          className={`${base} flex-[1.6] text-xs tracking-wide ${
            submitReady
              ? "bg-accent text-surface active:scale-95"
              : "bg-tile active:bg-accent-soft"
          }`}
        >
          Enter
        </button>
        {[...ROWS[2]].map((l) => (
          <button key={l} type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => onLetter(l)} className={`${key} flex-1 text-sm`}>
            {l}
          </button>
        ))}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={onBackspace}
          aria-label="delete"
          className={`${key} flex-[1.6] text-base`}
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
