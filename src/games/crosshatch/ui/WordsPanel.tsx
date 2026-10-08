import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Sparkle } from "lucide-react";
import { allWords, type GameState } from "../state/reducer";

/** The bonus mark, as an icon (lucide-only in chrome): the same solid
 * four-point star the line chips use. */
function BonusStar({ className = "" }: { className?: string }) {
  return (
    <Sparkle
      aria-hidden
      className={`inline h-3 w-3 shrink-0 text-accent ${className}`}
      fill="currentColor"
      strokeWidth={1}
    />
  );
}

/**
 * The words panel: every word of the day, shortest first then
 * alphabetical, blanks in place — where a blank sits between found
 * words is itself a gentle hint. Unfound words are tappable to aim the
 * next hint; hint-revealed letters show in the accent color, before
 * AND after the word is found. Bonus words — valid-grid words the list
 * doesn't hold — follow in their own group, each marked with a star. On a
 * board finished by hold, the list words never found move to their own
 * "Missed" group, spelled out — a group, not just a lighter grey, so
 * "missed" never rests on color alone. The header counts list words
 * only, so it adds up with the list under it.
 */
export function WordsPanel({
  state,
  open,
  onToggle,
  onHint,
  hintTargetWord,
  onSelectWord,
}: {
  state: GameState;
  open: boolean;
  onToggle: () => void;
  onHint: () => void;
  /** Unfound word the next hint will reveal into (tap to choose). */
  hintTargetWord: string | null;
  onSelectWord: (word: string) => void;
}) {
  const recentFirst = [...state.found].reverse();
  const bonusRecentFirst = [...state.bonus].reverse();
  // The word list depends only on the puzzle — not on every keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const words = useMemo(() => allWords(state), [state.puzzle]);
  const missed = state.solved
    ? words.filter((w) => !state.found.includes(w))
    : [];

  // Puzzle input auto-closes the panel; if keyboard focus was inside
  // it, the unmount drops focus to <body> — catch it on the toggle.
  const toggleRef = useRef<HTMLButtonElement>(null);
  const prevOpenRef = useRef(open);
  useEffect(() => {
    const was = prevOpenRef.current;
    prevOpenRef.current = open;
    if (was && !open && document.activeElement === document.body) {
      toggleRef.current?.focus();
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={toggleRef}
        type="button"
        onClick={onToggle}
        // The name the results card and coach sheet use for it. The
        // collapsed word run is visual only: this label replaces it.
        aria-label="Your words"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm">
          {recentFirst.length === 0 && bonusRecentFirst.length === 0 ? (
            <span className="text-ink-soft">Your words…</span>
          ) : (
            <>
              {recentFirst.map((word, i) => (
                <span
                  key={word}
                  className={i === 0 ? "font-semibold uppercase" : "uppercase"}
                >
                  {i > 0 && " "}
                  {word}
                </span>
              ))}
              {bonusRecentFirst.map((word, i) => (
                <span key={`bonus-${word}`} className="uppercase">
                  {(recentFirst.length > 0 || i > 0) && " "}
                  <BonusStar className="mr-0.5 -mt-0.5" />
                  {word}
                </span>
              ))}
            </>
          )}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          className="shrink-0 text-ink-soft"
          aria-hidden
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-line bg-surface-raised p-4 shadow-lg"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold tracking-widest text-ink-soft uppercase">
                {state.found.length}/{words.length} words
                {state.bonus.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 tracking-normal">
                    <BonusStar />
                    {state.bonus.length}
                    <span className="sr-only"> bonus</span>
                  </span>
                )}
              </span>
              {/* A finished board has nothing left to hint. */}
              {!state.solved && (
                <button
                  type="button"
                  onClick={onHint}
                  disabled={state.found.length === words.length}
                  className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-surface active:scale-95 disabled:opacity-40"
                >
                  Hint
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {words.map((word) => {
                const hinted = state.revealed[word] ?? [];
                const isFound = state.found.includes(word);
                // Finished by hold: unfound words are in Missed, below.
                if (!isFound && state.solved) return null;
                const letters = [...word].map((letter, i) =>
                  hinted.includes(i) ? (
                    <span
                      key={i}
                      className="text-accent"
                    >
                      {letter}
                    </span>
                  ) : isFound ? (
                    <span key={i}>{letter}</span>
                  ) : (
                    <span key={i} className="text-ink-soft">
                      ?
                    </span>
                  ),
                );
                if (isFound) {
                  return (
                    <span key={word} className="font-game text-xs uppercase">
                      {letters}
                    </span>
                  );
                }
                // Unfound words are tappable: aim the next hint.
                return (
                  <button
                    key={word}
                    type="button"
                    onClick={() => onSelectWord(word)}
                    aria-label={`unfound ${word.length}-letter word — tap to aim the next hint here`}
                    className={`-mx-1 -my-2.5 rounded px-1 py-2.5 font-game text-xs uppercase ${
                      hintTargetWord === word ? "ring-2 ring-accent" : ""
                    }`}
                  >
                    {letters}
                  </button>
                );
              })}
            </div>
            {missed.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <span className="mb-2 block text-xs font-semibold tracking-widest text-ink-soft uppercase">
                  {missed.length} missed
                </span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {missed.map((word) => (
                    <span key={word} className="font-game text-xs text-ink-soft uppercase">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {state.bonus.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <span className="mb-2 flex items-center gap-1 text-xs font-semibold tracking-widest text-ink-soft uppercase">
                  <BonusStar />
                  {state.bonus.length} bonus
                </span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {state.bonus.map((word) => (
                    <span key={word} className="inline-flex items-center gap-1 font-game text-xs uppercase">
                      <BonusStar />
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
