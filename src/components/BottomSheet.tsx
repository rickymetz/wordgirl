import { useEffect } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useModalFocus } from "./useModalFocus";
import { useViewport } from "../lib/useViewport";

/**
 * Bottom sheet on phone, centered modal on tablet+.
 * Blurred backdrop, focus containment, Escape to close.
 * Mount inside <AnimatePresence> so the exit plays.
 */
export function BottomSheet({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useModalFocus<HTMLDivElement>(true);
  const { vw } = useViewport();
  const isTablet = vw >= 768;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const sheetMotion = isTablet
    ? {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: reducedMotion
          ? { duration: 0 }
          : { type: "spring" as const, damping: 28, stiffness: 360 },
      }
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { type: "spring" as const, damping: 32, stiffness: 400 },
      };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center">
      <motion.div
        className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        {...sheetMotion}
        className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-line bg-surface-raised px-6 pt-3 shadow-xl outline-none md:max-w-2xl md:rounded-3xl md:border md:pt-6"
        style={{
          paddingBottom: isTablet
            ? "1.75rem"
            : "max(1.75rem, env(safe-area-inset-bottom))",
        }}
      >
        {/* Grab handle — phone only */}
        <div
          aria-hidden
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-line md:hidden"
        />
        {children}
      </motion.div>
    </div>
  );
}
