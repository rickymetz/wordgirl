import { motion } from "motion/react";
import { currentLevel, type GameState } from "../state/reducer";

/**
 * Spelling-Bee-style typed word: one slot per letter of the level's word
 * length, shown as faint "?" placeholders that typed letters overwrite
 * in the level color. Rejection feedback is the GameToast that
 * GameScreen floats above this row — it CANNOT live in here, because
 * this row sits inside a shrink-to-fit `overflow-hidden` wrapper that
 * would clip the pill to the width of the blanks.
 */
export function CurrentWord({ state }: { state: GameState }) {
  return (
    <div className="flex h-12 items-center justify-center">
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
