import { useCallback, useEffect, useRef, useState } from "react";
import { dateKeyFormats } from "../lib/date";
import { firstFitting, measurerFor } from "../lib/textFit";
import { useRemeasure } from "../lib/useRemeasure";
import { useToday } from "../lib/useToday";

/**
 * Keeps the card's date on ONE line: measures the column the layout
 * actually leaves and renders the longest `dateKeyFormats` rung that fits.
 * A constant here would be wrong twice over — the column is a percentage of
 * a rem-padded card, and the Font setting changes glyph widths without
 * changing the box — so `useRemeasure` re-runs it on every trigger that
 * moves those numbers.
 */
function useFittedDate(today: string): {
  ref: React.RefObject<HTMLParagraphElement | null>;
  text: string;
} {
  const ref = useRef<HTMLParagraphElement>(null);
  const [text, setText] = useState(() => dateKeyFormats(today)[0]);

  const measure = useCallback(() => {
    const el = ref.current;
    const formats = dateKeyFormats(today);
    if (!el) return setText(formats[0]);
    const measureText = measurerFor(el);
    // getBoundingClientRect, not clientWidth: clientWidth rounds to a whole
    // pixel and so reads up to half a pixel WIDER than the box really is,
    // which is enough to accept a rung that then wraps — the one thing the
    // ladder exists to prevent. The tightest real fit runs on ~0.1px of
    // slack, well inside that rounding error.
    const style = getComputedStyle(el);
    const width =
      el.getBoundingClientRect().width -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    setText(measureText ? firstFitting(formats, width, measureText) : formats[0]);
  }, [today]);

  useRemeasure(ref, measure);
  return { ref, text };
}

/**
 * The hub-card status block every game shares: today's date, front
 * and center, plus a play-state line ("Solved ✓ · 3-day streak").
 * Each game contributes only its loaders — the layout, streak
 * pluralization, and midnight-rollover reload live here once.
 */
export function GameStatus({
  loadState,
  loadStreak,
}: {
  /** Game-specific play state for today ("Solved ✓", "2/3 solved",
   * "In progress"), or null when the day is untouched. */
  loadState: (today: string) => Promise<string | null>;
  /** The game's displayStreak, in days. */
  loadStreak: (today: string) => Promise<number>;
}) {
  const today = useToday();
  const [line, setLine] = useState<string | null>(null);
  const date = useFittedDate(today);

  // Reloads on midnight rollover and PWA resume, not just on mount —
  // a stale "Solved ✓" for the new day is a broken promise.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadState(today), loadStreak(today)]).then(
      ([state, streakDays]) => {
        if (cancelled) return;
        const streak = streakDays > 1 ? `${streakDays}-day streak` : null;
        setLine([state, streak].filter(Boolean).join(" · ") || null);
      },
    );
    return () => {
      cancelled = true;
    };
    // The loaders close over module imports only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  return (
    <div className="mt-3">
      {/* Deliberately still wrappable: the fitted rung makes wrapping moot,
          and where there is nothing to measure with, wrapping is a kinder
          failure than clipping the date against the preview art. */}
      <p ref={date.ref} className="text-lg leading-tight font-bold text-accent">
        {date.text}
      </p>
      {line && (
        <p className="mt-0.5 text-sm font-semibold text-accent/75">{line}</p>
      )}
    </div>
  );
}
