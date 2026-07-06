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
      {/* The apex-up triangle occupies the top 75% of its box (apex at 0,
          base at 75%): its visible vertical middle is ~37.5%, well above
          the box center where flex puts the glyph. Split the difference
          with the centroid (50%) for optical balance. */}
      <span
        className="relative font-game leading-none font-extrabold text-surface"
        style={{
          top: sides === 3 ? "-4%" : 0,
          fontSize: Math.max(18, size * (sides === 3 ? 0.24 : 0.28)),
        }}
      >
        {remaining}
      </span>
    </motion.button>
  );
}
