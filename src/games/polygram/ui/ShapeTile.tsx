import { motion } from "motion/react";
import { regularPolygonClipPath } from "./polygonPath";

interface Props {
  letter: string;
  sides: number;
  size: number;
  x: number;
  y: number;
  /** Degrees to spin the polygon shape (the letter stays upright). */
  rotation: number;
  onTap: () => void;
}

export function ShapeTile({ letter, sides, size, x, y, rotation, onTap }: Props) {
  return (
    <motion.button
      type="button"
      onPointerDown={onTap}
      className="absolute top-1/2 left-1/2 flex items-center justify-center bg-accent-soft select-none"
      initial={{ scale: 0, x: "-50%", y: "-50%" }}
      animate={{ scale: 1, x: `calc(-50% + ${x}px)`, y: `calc(-50% + ${y}px)` }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
      style={{
        width: size,
        height: size,
        touchAction: "manipulation",
        // Clip the button itself: the polygon doubles as the tap target,
        // rotated so the petal's apex points away from the center.
        clipPath: regularPolygonClipPath(sides, rotation),
        transition: "clip-path 600ms cubic-bezier(0.65, 0, 0.35, 1)",
      }}
      aria-label={`letter ${letter}`}
    >
      {/* A regular polygon's centroid IS its box center, so the glyph is
          dead-centered — no optical nudging. Fixed size: type stays
          consistent while the shapes change scale across levels. */}
      <span
        className="relative font-game text-[26px] leading-none font-extrabold text-accent uppercase"
      >
        {letter}
      </span>
    </motion.button>
  );
}
