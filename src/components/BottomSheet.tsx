import { useEffect } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useModalFocus } from "./useModalFocus";

/**
 * The house bottom sheet: blurred backdrop, spring slide-up, grab
 * handle, focus containment — thumb-reach on a phone, where this app
 * lives. Closes on backdrop tap or Escape. Mount inside
 * <AnimatePresence> so the slide-out plays.
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 400 }}
        className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-line bg-surface-raised px-6 pt-3 shadow-xl outline-none md:max-w-2xl md:rounded-3xl md:border md:mb-8"
        // Fixed to the real viewport bottom, outside #root's safe-area
        // padding — the sheet carries its own.
        style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))" }}
      >
        <div
          aria-hidden
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-line"
        />
        {children}
      </motion.div>
    </div>
  );
}
