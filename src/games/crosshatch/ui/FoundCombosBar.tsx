import { AnimatePresence, motion } from "motion/react";
import type { GameState } from "../state/reducer";

/** Collapsible log of banked words, newest first. */
export function FoundCombosBar({
  state,
  open,
  onToggle,
}: {
  state: GameState;
  open: boolean;
  onToggle: () => void;
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
            {recentFirst.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Every new word in a valid grid lands here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {recentFirst.map((word) => (
                  <span
                    key={word}
                    className="text-sm font-semibold tracking-wide uppercase"
                  >
                    {word}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
