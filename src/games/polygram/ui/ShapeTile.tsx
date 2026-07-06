import { motion } from "motion/react";
import { regularPolygonClipPath } from "./polygonPath";

interface Props {
  letter: string;
  sides: number;
  size: number;
  x: number;
  y: number;
  onTap: () => void;
}

export function ShapeTile({ letter, sides, size, x, y, onTap }: Props) {
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
        // Clip the button itself: tiles mirror the central shape across
        // the shared edge, and the clip doubles as the tap hit area.
        clipPath: regularPolygonClipPath(sides, true),
        transition: "clip-path 600ms cubic-bezier(0.65, 0, 0.35, 1)",
      }}
      aria-label={`letter ${letter}`}
    >
      {/* Flipped triangle's visual mass is above box center — nudge up. */}
      <span
        className="relative text-2xl font-bold uppercase"
        style={{ top: sides === 3 ? "-8%" : 0 }}
      >
        {letter}
      </span>
    </motion.button>
  );
}
