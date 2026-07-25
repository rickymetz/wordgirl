import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
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
        aria-label="found words"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm">
          {recentFirst.length === 0 ? (
            <span className="text-ink-soft">Your words…</span>
          ) : (
            recentFirst.map((word, i) => (
              // Uppercase like Crosshatch's strip — one casing style
              // for found words across the hub's games.
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
            {/* Current level FIRST — its blanks and the Hint button must
                be visible without scrolling; completed levels follow. */}
            {state.puzzle.levels
              .slice(0, state.levelIndex + 1)
              .reverse()
              .map((lvl) => {
              const foundCount = lvl.words.filter((w) =>
                state.found.includes(w),
              ).length;
              const bonusCount = lvl.bonusWords.filter((w) =>
                state.found.includes(w),
              ).length;
              const isCurrent = lvl.size === state.puzzle.levels[state.levelIndex].size;
              // Alphabetical order with blanks in place: where a blank
              // falls between found words is itself a hint. Bonus finds
              // join the SAME run — one ABC sequence to read, not a
              // required list with a tail of stars.
              const entries = [
                ...lvl.words.map((word) => ({ word, bonus: false })),
                ...lvl.bonusWords
                  .filter((w) => state.found.includes(w))
                  .map((word) => ({ word, bonus: true })),
              ].sort((a, b) => a.word.localeCompare(b.word));
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
                        {/* Bonus tally, so the level count and the word
                            list below it add up at a glance. */}
                        {bonusCount > 0 && (
                          <span className="ml-1.5">
                            · <span className="text-accent">✦</span>
                            {bonusCount}
                          </span>
                        )}
                      </span>
                    </span>
                    {/* Hint sits WITH the words it reveals; disabled once
                        every unsolved word is fully revealed. */}
                    {isCurrent && foundCount < lvl.words.length && (
                      <button
                        type="button"
                        onClick={onHint}
                        disabled={hintTarget(state) === undefined}
                        className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-surface active:scale-95 disabled:opacity-40"
                      >
                        Hint
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {entries.map(({ word, bonus }) => {
                      const hinted = state.revealed[word] ?? [];
                      const isFound = bonus || state.found.includes(word);
                      const letters = [...word].map((letter, i) =>
                        hinted.includes(i) ? (
                          // The level color marks hint-revealed
                          // letters, before AND after the word is found.
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
                          <span
                            key={word}
                            className="font-game text-xs uppercase"
                          >
                            {bonus && (
                              <span className="text-accent" aria-label="bonus">
                                ✦
                              </span>
                            )}
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
                          className={`-mx-1 -my-2.5 rounded px-1 py-2.5 font-game text-xs uppercase ${
                            hintTargetWord === word
                              ? "ring-2 ring-accent"
                              : ""
                          }`}
                        >
                          {letters}
                        </button>
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
