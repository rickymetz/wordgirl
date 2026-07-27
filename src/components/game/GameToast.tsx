import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export interface ToastState {
  text: string;
  /** Keyed so an identical repeated message still re-animates. */
  nonce: number;
}

/**
 * Transient feedback state for a game board: show(text) replaces any
 * visible toast (and its timer) with a fresh one. Render the result
 * with <GameToast>, and mirror `toast?.text` into an aria-live region
 * so outcomes narrate.
 */
export function useToast(): {
  toast: ToastState | null;
  show: (text: string, durationMs?: number) => void;
} {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nonce = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (text: string, durationMs = 1600) => {
    setToast({ text, nonce: ++nonce.current });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), durationMs);
  };
  return { toast, show };
}

/**
 * The floating feedback pill every board uses. mode="wait" so rapid
 * submits never stack two pills; position it with `className`
 * (default: the board's top edge).
 *
 * Width: `w-max` keeps a message on ONE line — the shrink-to-fit an
 * absolute box would otherwise get is only the space right of `left-1/2`,
 * i.e. half the board, which would wrap pills that comfortably fit. The
 * cap then bounds it to the viewport, so a long message (Crosshatch's
 * "already found all these words") wraps to two centered lines instead
 * of running off both screen edges and making the page scroll
 * sideways. Position pills that can wrap so they grow AWAY from the
 * board — `bottom-full`, not a negative `top`.
 */
export function GameToast({
  toast,
  className = "top-0",
}: {
  toast: ToastState | null;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      {toast && toast.text && (
        <motion.div
          key={toast.nonce}
          aria-hidden
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`pointer-events-none absolute left-1/2 z-10 w-max max-w-[min(90vw,28rem)] -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-center text-sm font-bold text-balance text-surface ${className}`}
        >
          {toast.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
