import { AnimatePresence, motion } from "motion/react";
import { hintTarget, type GameState } from "../state/reducer";
import { POLYGON_NAMES } from "./polygonPath";

/**
 * Spelling-Bee-style found-words strip: a single collapsed line of found
 * words (most recent first) with a chevron that expands a dropdown
 * showing every level's words. Words render in alphabetical order with
 * blank slots for the unfound ones INTERLEAVED in place — where a blank
 * falls in the ordering is itself a gentle hint. Hint-revealed letters
 * render in the level color, permanently marking hint-assisted words.
 */
export function FoundWordsBar({
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
  /** Unsolved word the next hint will reveal into (tap to choose). */
  hintTargetWord: string | null;
  onSelectWord: (word: string) => void;
}) {
  const recentFirst = [...state.found].reverse();

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
              <span key={word} className={i === 0 ? "font-semibold" : ""}>
                {i > 0 && " "}
                {word[0].toUpperCase() + word.slice(1)}
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
            {/* Current level FIRST — its blanks and the Hint button must
                be visible without scrolling; completed levels follow. */}
            {state.puzzle.levels
              .slice(0, state.levelIndex + 1)
              .reverse()
              .map((lvl) => {
              const foundCount = lvl.words.filter((w) =>
                state.found.includes(w),
              ).length;
              const isCurrent = lvl.size === state.puzzle.levels[state.levelIndex].size;
              return (
                // data-level scopes the accent: each section's hinted
                // letters keep THEIR level's color (amethyst 3s, emerald
                // 4s…) rather than following the current level.
                <div key={lvl.size} data-level={lvl.size} className="mb-3 last:mb-0">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-widest text-ink-soft uppercase">
                      {POLYGON_NAMES[lvl.size]}
                      <span className="ml-2 font-medium text-ink-soft">
                        {foundCount}/{lvl.words.length}
                      </span>
                    </span>
                    {/* Hint sits WITH the words it reveals; disabled once
                        every unsolved word is fully revealed. */}
                    {isCurrent && foundCount < lvl.words.length && (
                      <button
                        type="button"
                        onClick={onHint}
                        disabled={hintTarget(state) === undefined}
                        className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-surface active:scale-95 disabled:opacity-40"
                      >
                        Hint
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {/* Alphabetical order with blanks in place: where a
                        blank falls between found words is itself a hint. */}
                    {lvl.words.map((word) => {
                      const hinted = state.revealed[word] ?? [];
                      const isFound = state.found.includes(word);
                      const letters = [...word].map((letter, i) =>
                        hinted.includes(i) ? (
                          // Level color + dotted underline mark
                          // hint-revealed letters (not color alone) —
                          // before AND after the word is found.
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
                          <span
                            key={word}
                            className="text-sm font-semibold uppercase"
                          >
                            {letters}
                          </span>
                        );
                      }
                      // Unsolved words are tappable: aim the next hint.
                      return (
                        <button
                          key={word}
                          type="button"
                          onClick={() => isCurrent && onSelectWord(word)}
                          aria-label={`unsolved ${word.length}-letter word — tap to aim the next hint here`}
                          className={`-mx-1 rounded px-1 text-sm font-semibold uppercase ${
                            hintTargetWord === word
                              ? "ring-2 ring-accent"
                              : ""
                          }`}
                        >
                          {letters}
                        </button>
                      );
                    })}
                    {/* Bonus finds: extra points, never required. */}
                    {lvl.bonusWords
                      .filter((w) => state.found.includes(w))
                      .map((word) => (
                        <span
                          key={word}
                          className="text-sm font-semibold uppercase"
                        >
                          <span className="text-accent" aria-label="bonus">
                            ✦
                          </span>
                          {word}
                        </span>
                      ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
