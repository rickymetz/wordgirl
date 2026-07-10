import { toMultiset } from "../engine/types";

/**
 * The day's rack: one fixed tile per bank letter (sorted a-z), dimmed
 * while a letter is staged or committed — tiles never move or vanish,
 * so nothing reflows as letters travel to the board and back.
 */
export function LetterBank({
  all,
  remaining,
  onLetter,
}: {
  /** puzzle.bank — the full day, fixed. */
  all: string[];
  /** state.bank — letters still available. */
  remaining: string[];
  onLetter: (letter: string) => void;
}) {
  const left = toMultiset(remaining);
  const seen: Record<string, number> = {};
  return (
    <div className="flex flex-wrap justify-center gap-1.5 select-none">
      {all.map((letter, i) => {
        // Dim the LAST duplicates first so the leftmost copy of each
        // letter stays live longest — stable, predictable dimming.
        const idx = (seen[letter] = (seen[letter] ?? 0) + 1);
        const available = idx <= (left[letter] ?? 0);
        return (
          <button
            key={i}
            type="button"
            disabled={!available}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onLetter(letter)}
            aria-label={
              available ? `letter ${letter}` : `letter ${letter} — placed`
            }
            className={`flex h-11 w-9 touch-manipulation items-center justify-center rounded-lg font-game text-lg uppercase transition-opacity ${
              available
                ? "bg-tile text-ink active:scale-90"
                : "bg-tile/40 text-ink-soft/40"
            }`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
