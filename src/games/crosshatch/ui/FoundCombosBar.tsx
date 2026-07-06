import { AnimatePresence, motion } from "motion/react";
import type { GameState } from "../state/reducer";

/** Collapsible log of found combos, newest first. */
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
  const latest = recentFirst[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="found combos"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm">
          {latest === undefined ? (
            <span className="text-ink-soft">Your combos…</span>
          ) : (
            <>
              <span className="font-semibold tracking-wide uppercase">
                {latest.join(" · ")}
              </span>
              {recentFirst.length > 1 && (
                <span className="text-ink-soft">
                  {"  "}+{recentFirst.length - 1} more
                </span>
              )}
            </>
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
                Submit a valid grid to log your first combo.
              </p>
            ) : (
              <ol className="flex flex-col gap-2">
                {recentFirst.map((combo, i) => (
                  <li
                    key={combo.join("|")}
                    className="flex items-baseline gap-3 text-sm"
                  >
                    <span className="w-6 shrink-0 text-right font-game text-xs text-ink-soft">
                      {state.found.length - i}
                    </span>
                    <span className="font-semibold tracking-wide uppercase">
                      {combo.join(" · ")}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
