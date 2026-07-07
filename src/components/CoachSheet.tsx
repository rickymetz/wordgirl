import type { ComponentType, ReactNode } from "react";
import { BottomSheet } from "./BottomSheet";

export interface CoachRule {
  Icon: ComponentType<{ className?: string }>;
  title: string;
  body: ReactNode;
}

/** Emphasis inside rule bodies: key terms pop out of the soft ink. */
export function Key({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-ink">{children}</span>;
}

/**
 * How-to-play as a bottom sheet: one row per rule — an accent icon
 * chip, a micro-headline, and a one-liner — so the game can be
 * skimmed in seconds instead of read.
 */
export function CoachSheet({
  rules,
  onClose,
}: {
  rules: CoachRule[];
  onClose: () => void;
}) {
  return (
    <BottomSheet labelledBy="coach-title" onClose={onClose}>
      <h2 id="coach-title" className="pb-5 text-lg font-bold">
        How to play
      </h2>
      <ul className="flex flex-col gap-4">
        {rules.map((rule) => (
          <li key={rule.title} className="flex items-start gap-3.5">
            <span
              aria-hidden
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"
            >
              <rule.Icon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{rule.title}</span>
              <span className="block pt-0.5 text-sm leading-snug text-ink-soft">
                {rule.body}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        data-autofocus
        onClick={onClose}
        className="mt-6 w-full rounded-full bg-accent py-2.5 font-semibold text-surface active:scale-95"
      >
        Got it
      </button>
    </BottomSheet>
  );
}
