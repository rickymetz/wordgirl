import { useState } from "react";
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
  onHint,
}: {
  state: GameState;
  onHint: () => void;
}) {
  const [open, setOpen] = useState(false);
  const recentFirst = [...state.found].reverse();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="found words"
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
                <div key={lvl.size} className="mb-3 last:mb-0">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-widest text-ink-soft uppercase">
                      {POLYGON_NAMES[lvl.size]} — {foundCount} of{" "}
                      {lvl.words.length}
                    </span>
                    {/* Hint sits WITH the words it reveals; disabled once
                        every unsolved word is fully revealed. */}
                    {isCurrent && foundCount < lvl.words.length && (
                      <button
                        type="button"
                        onClick={onHint}
                        disabled={hintTarget(state) === undefined}
                        className="rounded-full bg-accent px-3.5 py-1 text-xs font-semibold text-surface active:scale-95 disabled:opacity-40"
                      >
                        Hint
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {/* Alphabetical order with blanks in place: where a
                        blank falls between found words is itself a hint. */}
                    {lvl.words.map((word) => {
                      const hinted = state.revealed[word] ?? [];
                      const isFound = state.found.includes(word);
                      return (
                        <span
                          key={word}
                          // Unsolved words carry a dotted underline: even
                          // fully hint-revealed, they still must be typed
                          // in — without this they'd look identical to
                          // found words with hinted letters.
                          className={`text-sm font-semibold uppercase ${
                            isFound
                              ? ""
                              : "underline decoration-ink-soft/40 decoration-dotted underline-offset-4"
                          }`}
                          aria-label={isFound ? undefined : "unsolved word"}
                        >
                          {[...word].map((letter, i) =>
                            hinted.includes(i) ? (
                              // Level color marks hint-revealed letters —
                              // before AND after the word is found.
                              <span key={i} className="text-accent">
                                {letter}
                              </span>
                            ) : isFound ? (
                              <span key={i}>{letter}</span>
                            ) : (
                              <span key={i} className="text-ink-soft/40">
                                ?
                              </span>
                            ),
                          )}
                        </span>
                      );
                    })}
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
