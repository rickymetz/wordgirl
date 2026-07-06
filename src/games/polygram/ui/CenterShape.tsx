import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { SubmitResult } from "../state/reducer";
import { regularPolygonClipPath } from "./polygonPath";

interface Props {
  sides: number;
  size: number;
  lastResult: SubmitResult | null;
  onTap: () => void;
}

type Mood = "idle" | "blink" | "happy" | "sad";

/**
 * The submit button — and the game's personality. It blinks now and
 * then, beams when a word lands, and headshakes at nonsense. Purely
 * cosmetic; the game never depends on it.
 */
export function CenterShape({ sides, size, lastResult, onTap }: Props) {
  const [mood, setMood] = useState<Mood>("idle");

  useEffect(() => {
    if (!lastResult) return;
    setMood(lastResult.type === "correct" ? "happy" : "sad");
    const timer = setTimeout(() => setMood("idle"), 900);
    return () => clearTimeout(timer);
  }, [lastResult]);

  // Occasional double-blink while idle.
  useEffect(() => {
    if (mood !== "idle") return;
    const timer = setTimeout(
      () => {
        setMood("blink");
        setTimeout(() => setMood("idle"), 140);
      },
      2500 + Math.random() * 3500,
    );
    return () => clearTimeout(timer);
  }, [mood]);

  const shake =
    lastResult && lastResult.type !== "correct"
      ? { x: [0, -7, 7, -4, 4, 0] }
      : lastResult?.type === "correct"
        ? { scale: [1, 1.06, 1] }
        : {};

  const eye = Math.max(8, size * 0.07);

  return (
    <motion.button
      type="button"
      onPointerDown={onTap}
      className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-accent select-none"
      style={{
        width: size,
        height: size,
        touchAction: "manipulation",
        // Clip the button itself so taps register only inside the shape —
        // its box overlaps the surrounding tiles' boxes.
        clipPath: regularPolygonClipPath(sides),
        transition: "clip-path 600ms cubic-bezier(0.65, 0, 0.35, 1)",
      }}
      whileTap={{ scale: 0.94 }}
      animate={shake}
      key={lastResult?.nonce ?? 0}
      transition={{ duration: 0.45 }}
      aria-label="submit word"
    >
      <span
        className="relative flex"
        style={{ top: sides === 3 ? "12%" : "2%", gap: eye * 0.9 }}
        aria-hidden
      >
        <Eye mood={mood} size={eye} />
        <Eye mood={mood} size={eye} />
      </span>
    </motion.button>
  );
}

function Eye({ mood, size }: { mood: Mood; size: number }) {
  if (mood === "happy") {
    // Closed-happy arc: ^ ^
    return (
      <span
        className="rounded-full border-surface border-b-transparent border-l-transparent border-r-transparent"
        style={{ width: size, height: size, borderWidth: size * 0.22 }}
      />
    );
  }
  if (mood === "sad" || mood === "blink") {
    return (
      <span
        className="rounded-full bg-surface"
        style={{ width: size, height: size * 0.2, marginTop: size * 0.4 }}
      />
    );
  }
  return (
    <span className="rounded-full bg-surface" style={{ width: size, height: size }} />
  );
}
