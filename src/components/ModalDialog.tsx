import type { ReactNode } from "react";
import { useModalFocus } from "./useModalFocus";

/**
 * The house dialog: fixed backdrop, centered card, focus containment
 * and restoration. Tap-outside calls onClose when provided.
 */
export function ModalDialog({
  labelledBy,
  onClose,
  className = "",
  children,
}: {
  labelledBy: string;
  onClose?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useModalFocus<HTMLDivElement>(true);
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-surface/80 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`w-full max-w-sm rounded-3xl border border-line bg-surface-raised p-6 shadow-xl outline-none ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
