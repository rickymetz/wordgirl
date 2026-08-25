import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { GameDefinition } from "../games/types";
import { clearance } from "../lib/artClearance";
import { edgeFade, type EdgeFade } from "../lib/scrollFade";
import { useRemeasure } from "../lib/useRemeasure";

/**
 * Tracks which edges of the action scroller should fade, so the right-edge
 * fade shows only while there's more to scroll and a left-edge fade appears
 * once scrolled. A ResizeObserver re-checks when the card's width changes
 * (rotation, the responsive breakpoint); scroll updates it live.
 */
function useScrollFade() {
  const ref = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState<EdgeFade>("right");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setFade(edgeFade(el.scrollLeft, el.scrollWidth, el.clientWidth));
    update();
    el.addEventListener("scroll", update, { passive: true });
    // Guarded for environments without ResizeObserver (jsdom); scroll
    // updates still work there.
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, []);
  return { ref, fade };
}

/**
 * Keeps the card's title out of its preview art. The titles are long words
 * in a wide display face, so above the default Text size they outgrow their
 * column and run sideways THROUGH the art — worst on the longest names, but
 * which games it hits depends on the name, the face, the Text size and the
 * screen width together. So the card measures its own two boxes and drops
 * the art by exactly what it takes, rather than each game carrying a tuned
 * constant that is wrong for the next combination.
 *
 * The title's own text rect is what matters, not its column: the column
 * stops short of the art, and it is the overflowing WORD that collides.
 */
function useArtClearance() {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const [fix, setFix] = useState({ shift: 0, extraPad: 0 });

  const measure = useCallback(() => {
    const card = cardRef.current;
    const title = titleRef.current;
    const art = artRef.current;
    if (!card || !title || !art) return;
    // getBoundingClientRect on the heading gives its full column; a range
    // over its contents gives where the text actually ends. Environments
    // without range metrics (jsdom) can't answer, so leave the art centred
    // rather than shifting it on made-up numbers.
    const range = document.createRange();
    range.selectNodeContents(title);
    if (typeof range.getBoundingClientRect !== "function") return;
    const text = range.getBoundingClientRect();
    const applied = Number(
      /translateY\((-?[\d.]+)px\)/.exec(art.style.transform)?.[1] ?? 0,
    );
    const artBox = art.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const style = getComputedStyle(card);
    const next = clearance({
      titleRight: text.right,
      titleBottom: text.bottom,
      artLeft: artBox.left,
      // Back out our own shift, so every pass measures the same CSS layout
      // instead of compounding the last answer into a runaway. Read it off
      // the element rather than from state: an observer can fire before
      // React has handed us the current value, and measuring against a
      // stale shift silently undoes the correction.
      artTop: artBox.top - applied,
      artBottom: artBox.bottom - applied,
      // The content box bottom, which our padding leaves untouched: the
      // element's bottom edge and its padding grow together.
      cardBottom: cardBox.bottom - parseFloat(style.paddingBottom),
    });
    // Keep the same object when nothing moved: the padding we add resizes
    // the card, which re-triggers this, and a fresh object every pass would
    // re-render forever on a card that has already settled.
    setFix((prev) =>
      prev.shift === next.shift && prev.extraPad === next.extraPad
        ? prev
        : next,
    );
  }, []);

  useRemeasure(cardRef, measure);
  return { cardRef, titleRef, artRef, ...fix };
}

/**
 * Bento cluster per game: a large tile for the primary mode (the daily
 * puzzle) and, UNDER it, a horizontal scroller of secondary modes. Neutral
 * card surfaces — color comes from the game's accent level and its preview
 * art, matching the in-game look (grey petals, one saturated center).
 */
export function GameCard({ game }: { game: GameDefinition }) {
  const { ref, fade } = useScrollFade();
  const art = useArtClearance();
  return (
    <section data-level={game.accentLevel}>
      <Link
        ref={art.cardRef}
        to={`/games/${game.id}`}
        className="flex items-center overflow-hidden rounded-3xl bg-surface-tint px-6 py-6 transition-transform active:scale-[0.98]"
        // Padding, not height: it sits outside the content box, so the card
        // grows around the dropped art without moving the text down with it.
        style={
          art.extraPad
            ? { paddingBottom: `calc(1.5rem + ${art.extraPad}px)` }
            : undefined
        }
      >
        <div className="w-3/4 min-w-0 pr-2">
          <h2
            ref={art.titleRef}
            className="font-game text-2xl font-normal tracking-tight"
          >
            {game.name}
          </h2>
          <p className="mt-0.5 text-sm text-ink-soft">{game.tagline}</p>
          {game.Status && <game.Status />}
        </div>
        <div className="w-1/4 shrink-0">
          {/* Transform, not margin: the art is centred by the flex row, and
              a margin would grow the item and re-centre it, moving it half
              as far as asked. */}
          <div
            ref={art.artRef}
            className="w-32"
            style={art.shift ? { transform: `translateY(${art.shift}px)` } : undefined}
          >
            <game.Preview />
          </div>
        </div>
      </Link>
      {game.secondaryActions && (
        // A single fixed-width row under the card, scrolled horizontally at
        // every width. Each button is ~40% of the row, so two sit full and
        // the third is clipped at the right edge — the peek IS the "there's
        // more, scroll" cue. `.card-action-scroller` hides the scrollbar and
        // fades whichever edges still have content past them (data-fade, so
        // the right fade clears at the end and a left fade appears once
        // scrolled); snap keeps a button from resting half-clipped.
        <div
          ref={ref}
          data-fade={fade}
          className="card-action-scroller mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto"
        >
          {game.secondaryActions.map((action) => (
            <Link
              key={action.path}
              to={`/games/${game.id}/${action.path}`}
              className="flex min-h-11 w-[37%] flex-none snap-start items-center justify-center rounded-2xl bg-surface-tint px-4 py-3 text-center transition-transform active:scale-[0.97]"
            >
              <span className="font-semibold text-accent whitespace-nowrap">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
