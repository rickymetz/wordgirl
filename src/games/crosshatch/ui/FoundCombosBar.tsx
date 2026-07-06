import { AnimatePresence, motion } from "motion/react";
import { allWords, type GameState } from "../state/reducer";

/**
 * The words panel: every word of the day, shortest first then
 * alphabetical, blanks in place — where a blank sits between found
 * words is itself a gentle hint. Unfound words are tappable to aim the
 * next hint; hint-revealed letters show in the accent with a dotted
 * underline, before AND after the word is found.
 */
export function FoundCombosBar({
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
  const words = allWords(state);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="found words"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm">
          {recentFirst.length === 0 ? (
            <span className="text-ink-soft">Your words…</span>
          ) : (
            recentFirst.map((word, i) => (
              <span
                key={word}
                className={i === 0 ? "font-semibold uppercase" : "uppercase"}
              >
                {i > 0 && " "}
                {word}
              </span>
            ))
          )}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          className="shrink-0 text-ink-soft"
          aria-hidden
        >
          ⌄
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
              <span className="text-xs font-semibold tracking-widest text-ink-soft uppercase">
                {state.found.length}/{words.length} words
              </span>
              <button
                type="button"
                onClick={onHint}
                disabled={state.found.length === words.length}
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-surface active:scale-95 disabled:opacity-40"
              >
                Hint
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {words.map((word) => {
                const hinted = state.revealed[word] ?? [];
                const isFound = state.found.includes(word);
                const letters = [...word].map((letter, i) =>
                  hinted.includes(i) ? (
                    <span
                      key={i}
                      className="text-accent underline decoration-dotted underline-offset-2"
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
                    className={`-mx-1 rounded px-1 font-game text-xs uppercase ${
                      hintTargetWord === word ? "ring-2 ring-accent" : ""
                    }`}
                  >
                    {letters}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
