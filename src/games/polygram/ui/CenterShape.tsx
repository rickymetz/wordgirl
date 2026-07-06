import { motion } from "motion/react";
import type { SubmitResult } from "../state/reducer";
import { regularPolygonClipPath } from "./polygonPath";

interface Props {
  sides: number;
  size: number;
  /** Words still to find on this level — displayed in the shape. */
  remaining: number;
  lastResult: SubmitResult | null;
  onTap: () => void;
}

/**
 * The submit button. Shows how many words are left on the level;
 * personality lives in the motion — a happy pulse on a correct word,
 * a headshake at nonsense.
 */
export function CenterShape({ sides, size, remaining, lastResult, onTap }: Props) {
  const shake =
    lastResult && lastResult.type !== "correct"
      ? { x: [0, -7, 7, -4, 4, 0] }
      : lastResult?.type === "correct"
        ? { scale: [1, 1.06, 1] }
        : {};

  return (
    <motion.button
      type="button"
      onPointerDown={onTap}
      className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center bg-accent select-none"
      style={{
        width: size,
        height: size,
        touchAction: "manipulation",
        // Clip the button itself so taps register only inside the shape.
        clipPath: regularPolygonClipPath(sides),
        transition: "clip-path 600ms cubic-bezier(0.65, 0, 0.35, 1)",
      }}
      whileTap={{ scale: 0.94 }}
      animate={shake}
      key={lastResult?.nonce ?? 0}
      transition={{ duration: 0.45 }}
      aria-label={`submit word — ${remaining} words left`}
    >
      {/* The triangle's centroid sits below its box center visually —
          drop the count slightly so it reads centered in the shape. */}
      <span
        className="relative font-game leading-none font-extrabold text-surface"
        style={{
          top: sides === 3 ? "8%" : 0,
          fontSize: Math.max(18, size * (sides === 3 ? 0.24 : 0.28)),
        }}
      >
        {remaining}
      </span>
    </motion.button>
  );
}
