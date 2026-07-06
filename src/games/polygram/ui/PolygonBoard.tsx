import { AnimatePresence, motion } from "motion/react";
import type { GameState } from "../state/reducer";
import { CenterShape } from "./CenterShape";
import { ShapeTile } from "./ShapeTile";
import {
  CLUSTER_Y_OFFSET,
  TILE_SCALE,
  apothem,
  boardExtent,
  edgeMidAngle,
} from "./polygonPath";

interface Props {
  state: GameState;
  onLetter: (letter: string) => void;
  onSubmit: () => void;
}

const BOARD = 340;
/** Hairline seam between the central shape and its tiles. */
const SEAM = 3;

export function PolygonBoard({ state, onLetter, onSubmit }: Props) {
  const sides = state.puzzle.levels[state.levelIndex].size;
  const letters = state.puzzle.letters.slice(0, sides);

  // Central shape circumradius: the whole edge-flush cluster must fit.
  const R = (BOARD / 2 - 2) / boardExtent(sides);
  const scale = TILE_SCALE[sides];
  const centerSize = 2 * R;
  const tileSize = 2 * R * scale;
  // Tile center: central apothem + tile apothem out along the edge normal.
  const dist = apothem(sides) * R * (1 + scale) + SEAM;
  // Odd-sided clusters hang low; shift content to visually center them.
  const yShift = CLUSTER_Y_OFFSET[sides] * R;

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
        {letters.map((letter, i) => {
          const angle = edgeMidAngle(i, sides);
          return (
            <ShapeTile
              key={`${letter}-${i}`}
              letter={letter}
              sides={sides}
              size={tileSize}
              x={dist * Math.cos(angle)}
              y={dist * Math.sin(angle)}
              onTap={() => onLetter(letter)}
            />
          );
        })}
        <CenterShape
          sides={sides}
          size={centerSize}
          lastResult={state.lastResult}
          onTap={onSubmit}
        />
      </div>
      {/* Floating score pop on a correct submit. */}
      <AnimatePresence>
        {state.lastResult?.type === "correct" && (
          <motion.span
            key={state.lastResult.nonce}
            className="pointer-events-none absolute top-1/2 left-1/2 text-xl font-bold text-good"
            initial={{ opacity: 1, x: "-50%", y: "-140%" }}
            animate={{ opacity: 0, y: "-260%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          >
            +{state.lastResult.points}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
