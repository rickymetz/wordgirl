import { useEffect, type ReactNode } from "react";
import { useModalFocus } from "./useModalFocus";

/**
 * The house dialog: fixed backdrop, centered card, focus containment
 * and restoration. Tap-outside or Escape calls onClose when provided.
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

  useEffect(() => {
    if (!onClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-6">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative w-full max-w-sm rounded-3xl border border-line bg-surface-raised p-6 shadow-xl outline-none md:max-w-md ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
