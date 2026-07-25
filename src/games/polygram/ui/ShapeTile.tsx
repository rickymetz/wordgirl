import { motion } from "motion/react";
import { regularPolygonClipPath } from "./polygonPath";

interface Props {
  letter: string;
  sides: number;
  /** The polygon size (3–10) at which this letter was introduced. */
  introLevel: number;
  size: number;
  x: number;
  y: number;
  /** Degrees to spin the polygon shape (the letter stays upright). */
  rotation: number;
  onTap: () => void;
}

export function ShapeTile({ letter, sides, introLevel, size, x, y, rotation, onTap }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onTap}
      // clip-path clips the browser focus ring, so keyboard focus shows
      // as a fill change instead.
      className="absolute top-1/2 left-1/2 flex items-center justify-center bg-tile outline-none select-none focus-visible:bg-accent-soft"
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
      {/* Rubik Mono One ships a single (heavy) 400 weight — no bold. */}
      {/* Every letter wears the color of the level that introduced it —
          the three seed letters included, so they read as the triangle's
          own rather than as the only uncolored glyphs on the board. */}
      <span
        className="relative font-game text-[24px] leading-none font-normal uppercase"
        style={{ color: `var(--level-${introLevel})` }}
      >
        {letter}
      </span>
    </motion.button>
  );
}
