const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

/** On-screen keyboard — the game is free typing, so it needs all 26. */
export function Keyboard({
  onLetter,
  onBackspace,
  onEnter,
}: {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
}) {
  const key =
    "flex h-12 items-center justify-center rounded-lg bg-tile font-semibold uppercase active:bg-accent-soft [@media(max-height:720px)]:h-10";
  return (
    <div className="flex w-full max-w-md flex-col gap-1.5">
      <div className="flex gap-1.5">
        {[...ROWS[0]].map((l) => (
          <button key={l} type="button" onClick={() => onLetter(l)} className={`${key} flex-1 text-sm`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 px-4">
        {[...ROWS[1]].map((l) => (
          <button key={l} type="button" onClick={() => onLetter(l)} className={`${key} flex-1 text-sm`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onEnter}
          className={`${key} flex-[1.6] text-xs tracking-wide`}
        >
          Enter
        </button>
        {[...ROWS[2]].map((l) => (
          <button key={l} type="button" onClick={() => onLetter(l)} className={`${key} flex-1 text-sm`}>
            {l}
          </button>
        ))}
        <button
          type="button"
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
