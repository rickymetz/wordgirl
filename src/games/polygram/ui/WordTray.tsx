import { motion } from "motion/react";
import type { GameState } from "../state/reducer";

interface Props {
  state: GameState;
  onBackspace: () => void;
}

/** The word in progress: one slot per letter of the current level size. */
export function WordTray({ state, onBackspace }: Props) {
  const size = state.puzzle.levels[state.levelIndex].size;
  const letters = [...state.current];

  return (
    <button
      type="button"
      onPointerDown={onBackspace}
      className="mx-auto flex h-14 items-center justify-center gap-1.5"
      aria-label="current word — tap to delete last letter"
      style={{ touchAction: "manipulation" }}
    >
      {Array.from({ length: size }, (_, i) => (
        <span
          key={i}
          className="flex h-11 w-9 items-end justify-center border-b-2 border-line pb-1 font-game text-2xl font-bold uppercase"
        >
          {letters[i] && (
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              {letters[i]}
            </motion.span>
          )}
        </span>
      ))}
    </button>
  );
}
