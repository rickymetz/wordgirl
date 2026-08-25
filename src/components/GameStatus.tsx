import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { dateKeyFormats } from "../lib/date";
import { firstFitting, measurerFor } from "../lib/textFit";
import { useToday } from "../lib/useToday";

/**
 * Keeps the card's date on ONE line: measures the column the layout
 * actually leaves and renders the longest `dateKeyFormats` rung that fits.
 * A constant here would be wrong twice over — the column is a percentage of
 * a rem-padded card, and the Font setting changes glyph widths without
 * changing the box — so this re-measures on all three triggers: the box
 * resizing (Text size, rotation), the web fonts finishing (first paint
 * measures fallback metrics otherwise), and the settings attributes on
 * <html> flipping (the Font swap, which moves no box at all).
 */
function useFittedDate(today: string): {
  ref: React.RefObject<HTMLParagraphElement | null>;
  text: string;
} {
  const ref = useRef<HTMLParagraphElement>(null);
  const [text, setText] = useState(() => dateKeyFormats(today)[0]);

  // Layout effect, not effect: measuring before paint means the long rung
  // is never briefly painted (and wrapped) before the fitted one replaces it.
  useLayoutEffect(() => {
    const el = ref.current;
    const formats = dateKeyFormats(today);
    if (!el) {
      setText(formats[0]);
      return;
    }
    const update = () => {
      const measure = measurerFor(el);
      setText(
        measure ? firstFitting(formats, el.clientWidth, measure) : formats[0],
      );
    };
    update();

    const resize =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    resize?.observe(el);
    // Settings are applied by mutating <html> (data-font, style fontSize),
    // not through React, so nothing else would tell us to re-measure.
    const attrs =
      typeof MutationObserver !== "undefined" ? new MutationObserver(update) : null;
    attrs?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-font", "style"],
    });
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) update();
    });
    return () => {
      cancelled = true;
      resize?.disconnect();
      attrs?.disconnect();
    };
  }, [today]);

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
