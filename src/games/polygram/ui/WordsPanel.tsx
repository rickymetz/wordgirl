import { motion } from "motion/react";
import { currentLevel, type GameState } from "../state/reducer";

interface Props {
  state: GameState;
  onHint: () => void;
}

/**
 * The current level's words: found ones shown whole, unsolved ones as
 * blank slots (with any hint-revealed letters). The hint button reveals
 * the next letter of the first unsolved word — unlimited, so nobody is
 * ever stuck, but each reveal halves that word's points.
 */
export function WordsPanel({ state, onHint }: Props) {
  const level = currentLevel(state);
  const found = level.words.filter((w) => state.found.includes(w));
  const unsolved = level.words.filter((w) => !state.found.includes(w));

  return (
    <div className="rounded-2xl border border-line bg-surface-raised px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-soft">
          {found.length} of {level.words.length} words
        </span>
        <button
          type="button"
          onPointerDown={onHint}
          className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent active:scale-95"
          style={{ touchAction: "manipulation" }}
        >
          Hint
        </button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {found.map((word) => (
          <motion.span
            key={word}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-semibold tracking-wide uppercase"
          >
            {word}
          </motion.span>
        ))}
        {unsolved.map((word) => (
          <span key={word} className="flex gap-1" aria-label="unsolved word">
            {[...word].map((letter, i) => (
              <span
                key={i}
                className="inline-block w-4 border-b-2 border-line text-center text-sm font-semibold uppercase"
              >
                {i < (state.revealed[word] ?? 0) ? letter : " "}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
