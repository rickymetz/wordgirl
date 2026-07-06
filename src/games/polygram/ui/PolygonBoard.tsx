import { AnimatePresence, motion } from "motion/react";
import { unsolvedWords, type GameState } from "../state/reducer";
import { CenterShape } from "./CenterShape";
import { ShapeTile } from "./ShapeTile";
import { FLOWER, edgeMidDeg } from "./polygonPath";

interface Props {
  state: GameState;
  /** Display permutation: position i shows letters[order[i]]. */
  order: number[];
  onLetter: (letter: string) => void;
  onSubmit: () => void;
}

// Fit narrow phones instead of clipping a hard-coded square.
const BOARD =
  typeof window === "undefined" ? 340 : Math.min(340, window.innerWidth - 40);
/** Whitespace between the central shape's edges and the petals, px. */
const RING_GAP = 18;

export function PolygonBoard({ state, order, onLetter, onSubmit }: Props) {
  const sides = state.puzzle.levels[state.levelIndex].size;
  const letters = state.puzzle.letters.slice(0, sides);
  const { d, extent, yOffset } = FLOWER[sides];

  // Petal circumradius: the whole flower must fit in the board square.
  const R = (BOARD / 2 - 2) / extent;
  const tileSize = 2 * R;
  const dist = d * R;
  // The center grows to keep a CONSTANT whitespace ring to the petals:
  // at high N the petal ring is pushed out (petal-petal separation), and
  // a fixed-ratio center would leave a ballooning empty hole.
  const cos = Math.cos(Math.PI / sides);
  const centerApothem = dist - R * cos - RING_GAP;
  const centerSize = Math.max(0.62 * tileSize, (2 * centerApothem) / cos);
  const yShift = yOffset * R;

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width: BOARD, height: BOARD, userSelect: "none" }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${yShift}px)`,
          transition: "transform 600ms cubic-bezier(0.65, 0, 0.35, 1)",
        }}
      >
        {order.map((letterIdx, pos) => {
          const letter = letters[letterIdx];
          if (letter === undefined) return null;
          const deg = edgeMidDeg(pos, sides);
          const rad = (deg * Math.PI) / 180;
          return (
            <ShapeTile
              // Keyed by the letter's index so a shuffled tile GLIDES to
              // its new slot instead of remounting.
              key={letterIdx}
              letter={letter}
              sides={sides}
              size={tileSize}
              x={dist * Math.cos(rad)}
              y={dist * Math.sin(rad)}
              // Base faces the center, apex points outward.
              rotation={deg + 90}
              onTap={() => onLetter(letter)}
            />
          );
        })}
        <CenterShape
          sides={sides}
          size={centerSize}
          remaining={unsolvedWords(state).length}
          lastResult={state.lastResult}
          onTap={onSubmit}
        />
      </div>
      {/* Floating score pop on a correct submit. */}
      <AnimatePresence>
        {state.lastResult?.type === "correct" && (
          <motion.span
            key={state.lastResult.nonce}
            className="pointer-events-none absolute top-1/2 left-1/2 font-game text-xl font-bold text-good"
            initial={{ opacity: 1, x: "-50%", y: "-140%" }}
            animate={{ opacity: 0, y: "-260%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          >
            +{state.lastResult.points}
            {state.lastResult.bonus && " ✦"}
            {state.phase !== "playing" && " · bonus!"}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
