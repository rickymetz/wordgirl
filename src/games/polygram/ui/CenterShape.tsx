import { useEffect, useState } from "react";
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

type Mood = "idle" | "blink" | "happy" | "sad";

/**
 * The submit button — and the game's personality. It shows how many
 * words are left on the level, blinks now and then, beams when a word
 * lands, and headshakes at nonsense.
 */
export function CenterShape({ sides, size, remaining, lastResult, onTap }: Props) {
  const [mood, setMood] = useState<Mood>("idle");

  useEffect(() => {
    if (!lastResult) return;
    setMood(lastResult.type === "correct" ? "happy" : "sad");
    const timer = setTimeout(() => setMood("idle"), 900);
    return () => clearTimeout(timer);
  }, [lastResult]);

  // Occasional blink while idle.
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

  const eye = Math.max(5, size * 0.055);

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
      {/* The triangle's base sits at 75% of its box — keep the stack's
          bottom above it while dropping it below the narrow apex. */}
      <span
        className="relative flex flex-col items-center"
        style={{ top: sides === 3 ? "6%" : 0 }}
      >
        <span className="flex" style={{ gap: eye * 2 }} aria-hidden>
          <Eye mood={mood} size={eye} />
          <Eye mood={mood} size={eye} />
        </span>
        <span
          className="font-game leading-none font-extrabold text-surface"
          style={{
            fontSize: Math.max(16, size * (sides === 3 ? 0.22 : 0.24)),
            marginTop: eye,
          }}
        >
          {remaining}
        </span>
      </span>
    </motion.button>
  );
}

function Eye({ mood, size }: { mood: Mood; size: number }) {
  if (mood === "happy") {
    // Closed-happy arc: ^ ^
    return (
      <span
        className="rounded-full border-surface border-r-transparent border-b-transparent border-l-transparent"
        style={{ width: size, height: size, borderWidth: size * 0.25 }}
      />
    );
  }
  if (mood === "sad" || mood === "blink") {
    return (
      <span
        className="rounded-full bg-surface"
        style={{ width: size, height: size * 0.22, marginTop: size * 0.39 }}
      />
    );
  }
  return (
    <span className="rounded-full bg-surface" style={{ width: size, height: size }} />
  );
}
