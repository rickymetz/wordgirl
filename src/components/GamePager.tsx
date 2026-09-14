import { useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { games } from "../games/registry";

/**
 * Carousel between the five games' parallel pages (archive ↔ archive,
 * stats ↔ stats): swipe left/right anywhere on the page, or use the
 * chevrons beside the title. Every game reaches both pages by the
 * checklist, so the cycle can never land on a missing route
 * (GamePager.test.ts pins that).
 */

/** Cyclic neighbor. Pure and registry-free so it's unit-testable. */
export function adjacentIn(
  ids: readonly string[],
  id: string,
  dir: 1 | -1,
): string {
  const i = ids.indexOf(id);
  return ids[(i + dir + ids.length) % ids.length];
}

type PagerPage = "archive" | "stats";

function usePager(gameId: string, page: PagerPage) {
  const navigate = useNavigate();
  const self = games.find((g) => g.id === gameId);
  const ids = games.map((g) => g.id);
  const nameOf = (id: string) => games.find((g) => g.id === id)!.name;
  // Unknown game (a test fixture, a renamed id): no pager rather than a
  // cycle computed off a -1 index.
  if (!self) return null;
  const go = (dir: 1 | -1) => {
    const target = adjacentIn(ids, gameId, dir);
    // pagerDir rides navigation state so the INCOMING page knows which
    // side to slide in from; a plain link navigation carries none and
    // mounts static.
    navigate(`/games/${target}/${page}`, { state: { pagerDir: dir } });
  };
  return {
    go,
    name: self.name,
    prevName: nameOf(adjacentIn(ids, gameId, -1)),
    nextName: nameOf(adjacentIn(ids, gameId, 1)),
  };
}

/**
 * The swipeable page shell — a drop-in for the archive/stats pages'
 * outer div (same className contract). Touch and pen only: a mouse
 * drag is text selection, not a page turn. touch-pan-y leaves vertical
 * scrolling to the browser (a scroll fires pointercancel and cleanly
 * aborts the swipe) while horizontal movement stays ours.
 */
export function GamePager({
  gameId,
  page,
  accent,
  className,
  children,
}: {
  gameId: string;
  page: PagerPage;
  accent: number | string;
  className: string;
  children: ReactNode;
}) {
  const pager = usePager(gameId, page);
  const location = useLocation();
  const reduced = useReducedMotion();
  const start = useRef<{ id: number; x: number; y: number; t: number } | null>(
    null,
  );

  const dirIn =
    (location.state as { pagerDir?: 1 | -1 } | null)?.pagerDir ?? 0;

  return (
    <motion.div
      data-level={accent}
      className={`${className} touch-pan-y touch-pinch-zoom`}
      // Slide in from the side the swipe came from; reduced motion
      // mounts static (motion animations are JS-driven, so the global
      // CSS 0.01ms rule cannot shorten them — this branch is the off
      // switch).
      initial={dirIn && !reduced ? { x: dirIn * 32, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onPointerDown={(e) => {
        if (!pager || e.pointerType === "mouse") return;
        start.current = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          t: performance.now(),
        };
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s || e.pointerId !== s.id) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        // A page turn is a deliberate flick: fast, long, and flatter
        // than 2:1 — anything else is a tap or a wobbly scroll.
        if (performance.now() - s.t > 700) return;
        if (Math.abs(dx) < 64 || Math.abs(dx) < 2 * Math.abs(dy)) return;
        pager?.go(dx < 0 ? 1 : -1);
      }}
      onPointerCancel={() => (start.current = null)}
    >
      {children}
    </motion.div>
  );
}

/**
 * The title-row control: ‹ GameName ›. Chevrons are 36px boxes with
 * 44px hit areas in a gap-2 row — centres exactly 44px apart, no
 * negative horizontal margins (two adjacent icon buttons that both
 * collapse the gap click-steal each other; see DictionaryLink).
 */
export function GamePagerNav({
  gameId,
  page,
}: {
  gameId: string;
  page: PagerPage;
}) {
  const pager = usePager(gameId, page);
  if (!pager) return null;
  const { go, name, prevName, nextName } = pager;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label={`previous game: ${prevName}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:scale-90 after:absolute after:-inset-1"
      >
        <ChevronLeft aria-hidden className="h-5 w-5" />
      </button>
      <span className="text-sm font-semibold text-accent">{name}</span>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label={`next game: ${nextName}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:scale-90 after:absolute after:-inset-1"
      >
        <ChevronRight aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );
}
