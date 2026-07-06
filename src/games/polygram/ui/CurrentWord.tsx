import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { currentLevel, type GameState } from "../state/reducer";

/**
 * Spelling-Bee-style typed word: one slot per letter of the level's word
 * length, shown as faint "?" placeholders that typed letters overwrite
 * in the level color. A black toast appears above for rejections.
 */
export function CurrentWord({ state }: { state: GameState }) {
  const [toast, setToast] = useState<{ text: string; nonce: number } | null>(
    null,
  );

  const size = currentLevel(state).size;
  useEffect(() => {
    const result = state.lastResult;
    if (!result || result.type === "correct") return;
    const text = {
      invalid: "Not in word list",
      duplicate: "Already found",
      tooShort: `Too short — ${size}-letter words`,
      empty: "Tap letters to spell a word",
    }[result.type];
    setToast({ text, nonce: result.nonce });
    const timer = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(timer);
  }, [state.lastResult, size]);

  return (
    <div className="relative flex h-12 items-center justify-center">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.nonce}
            className="absolute -top-8 z-10 rounded-md bg-ink px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-surface"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Monospace: every glyph shares one advance width, so spacing
          between typed letters and placeholders is perfectly regular. */}
      <span className="flex font-game text-2xl font-normal uppercase">
        {Array.from({ length: currentLevel(state).size }, (_, i) => {
          const letter = state.current[i];
          return letter ? (
            <motion.span
              key={`${i}-${letter}`}
              className="inline-block text-accent"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
            >
              {letter}
            </motion.span>
          ) : (
            <span key={i} className="inline-block text-ink-soft/70">
              ?
            </span>
          );
        })}
      </span>
    </div>
  );
}
