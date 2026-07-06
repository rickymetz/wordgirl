import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GameState } from "../state/reducer";
import { POLYGON_NAMES } from "./polygonPath";

/**
 * Spelling-Bee-style found-words strip: a single collapsed line of found
 * words (most recent first) with a chevron that expands a dropdown
 * showing every level's words. Words render in alphabetical order with
 * blank slots for the unfound ones INTERLEAVED in place — where a blank
 * falls in the ordering is itself a gentle hint, no prompt needed.
 */
export function FoundWordsBar({ state }: { state: GameState }) {
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
            {state.puzzle.levels.slice(0, state.levelIndex + 1).map((lvl) => {
              const foundCount = lvl.words.filter((w) =>
                state.found.includes(w),
              ).length;
              return (
                <div key={lvl.size} className="mb-3 last:mb-0">
                  <div className="mb-1 text-xs font-semibold tracking-widest text-ink-soft uppercase">
                    {POLYGON_NAMES[lvl.size]} — {foundCount} of{" "}
                    {lvl.words.length}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {/* Alphabetical order with blanks in place: where a
                        blank falls between found words is itself a hint. */}
                    {lvl.words.map((word) =>
                      state.found.includes(word) ? (
                        <span
                          key={word}
                          className="text-sm font-semibold uppercase"
                        >
                          {word}
                        </span>
                      ) : (
                        <span
                          key={word}
                          className="text-sm font-semibold uppercase"
                          aria-label="unsolved word"
                        >
                          {[...word].map((letter, i) =>
                            i < (state.revealed[word] ?? 0) ? (
                              <span key={i}>{letter}</span>
                            ) : (
                              <span key={i} className="text-ink-soft/40">
                                ?
                              </span>
                            ),
                          )}
                        </span>
                      ),
                    )}
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
