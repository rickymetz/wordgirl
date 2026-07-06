import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { GameState } from "../state/reducer";

/**
 * Spelling-Bee-style typed word: large centered letters with a blinking
 * caret, and a black toast above it for rejected submissions.
 */
export function CurrentWord({ state }: { state: GameState }) {
  const [toast, setToast] = useState<{ text: string; nonce: number } | null>(
    null,
  );

  useEffect(() => {
    const result = state.lastResult;
    if (!result || result.type === "correct") return;
    setToast({
      text: result.type === "invalid" ? "Not in word list" : "Already found",
      nonce: result.nonce,
    });
    const timer = setTimeout(() => setToast(null), 1200);
    return () => clearTimeout(timer);
  }, [state.lastResult]);

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
      <span className="font-game text-3xl font-extrabold tracking-wider uppercase">
        {[...state.current].map((letter, i) => (
          <motion.span
            key={`${i}-${letter}`}
            className="inline-block text-accent"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
          >
            {letter}
          </motion.span>
        ))}
      </span>
      {/* Blinking caret. */}
      <motion.span
        className="ml-0.5 h-8 w-0.5 bg-accent"
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
