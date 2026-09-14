import { Suspense, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { games } from "../games/registry";

/**
 * Carousel between the five games' parallel pages (archive ↔ archive,
 * stats ↔ stats): drag left/right anywhere on the page — the page
 * follows the finger and the neighboring game's REAL page peeks in
 * from that side — or use the chevrons beside the title. Cycles in
 * registry order with wrap-around; every game reaches both pages by
 * the checklist, so the cycle can never 404 (GamePager.test.ts).
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
  // Unknown game (a test fixture, a renamed id): no pager rather than a
  // cycle computed off a -1 index.
  if (!self) return null;
  const prevId = adjacentIn(ids, gameId, -1);
  const nextId = adjacentIn(ids, gameId, 1);
  const nameOf = (id: string) => games.find((g) => g.id === id)!.name;
  const go = (dir: 1 | -1, slide: boolean) => {
    // The next page starts at its own top — carrying this page's
    // scroll into a different game's archive strands the reader
    // mid-list.
    window.scrollTo(0, 0);
    // pagerDir rides navigation state so the INCOMING page knows which
    // side to slide in from. A completed drag already animated the
    // turn, so it navigates without one and mounts static — as does a
    // plain link.
    navigate(`/games/${dir === 1 ? nextId : prevId}/${page}`, {
      state: slide ? { pagerDir: dir } : undefined,
    });
  };
  return { go, prevId, nextId, name: self.name, nameOf };
}

/**
 * A neighbor's real page, mounted only while a drag is engaged, as a
 * non-interactive preview beside the current one. It renders its own
 * accent, header and data (loads are local and the chunk is
 * SW-precached, so it fills in mid-drag); inert + aria-hidden keep it
 * out of focus and the a11y tree until it becomes the real page.
 */
function PeekPane({
  gameId,
  page,
  side,
  top,
}: {
  gameId: string;
  page: PagerPage;
  side: 1 | -1;
  top: number;
}) {
  const Page = games
    .find((g) => g.id === gameId)
    ?.extraRoutes?.find((r) => r.path === page)?.Page;
  if (!Page) return null;
  return (
    <div
      aria-hidden
      inert
      className="pointer-events-none absolute w-full overflow-hidden"
      style={{ left: `${side * 100}%`, top, maxHeight: "100vh" }}
    >
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    </div>
  );
}

/** Drag bookkeeping lives in a ref: frames write the track transform
 * straight to the DOM (house drag rule — never setState per frame). */
interface DragState {
  id: number;
  x: number;
  y: number;
  t: number;
  engaged: boolean;
  dx: number;
}

/**
 * The swipeable page shell — a drop-in for the archive/stats pages'
 * outer div (same className contract, now nested one level down).
 * Touch and pen only: a mouse drag is text selection, not a page
 * turn. touch-pan-y leaves vertical scrolling to the browser (a
 * scroll fires pointercancel and cleanly aborts the drag) while
 * horizontal movement stays ours.
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
  const outerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<DragState | null>(null);
  // One state flip per drag mounts the two peek panes; every frame
  // after that is a direct transform write.
  const [peek, setPeek] = useState<{ top: number } | null>(null);

  const setX = (x: number) => {
    if (trackRef.current) trackRef.current.style.transform = `translateX(${x}px)`;
  };
  const settle = (toX: number, after?: () => void) => {
    const track = trackRef.current;
    if (!track) return;
    if (reduced) {
      setX(toX);
      after?.();
      return;
    }
    const from = drag.current?.dx ?? 0;
    const anim = track.animate(
      [
        { transform: `translateX(${from}px)` },
        { transform: `translateX(${toX}px)` },
      ],
      { duration: 180, easing: "ease-out", fill: "forwards" },
    );
    anim.onfinish = () => {
      anim.cancel();
      setX(toX);
      after?.();
    };
  };

  const dirIn =
    (location.state as { pagerDir?: 1 | -1 } | null)?.pagerDir ?? 0;

  return (
    <div
      ref={outerRef}
      className="relative w-full grow touch-pan-y touch-pinch-zoom [overflow-x:clip]"
      onPointerDown={(e) => {
        if (!pager || e.pointerType === "mouse") return;
        drag.current = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          t: performance.now(),
          engaged: false,
          dx: 0,
        };
      }}
      onPointerMove={(e) => {
        const s = drag.current;
        if (!s || e.pointerId !== s.id) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (!s.engaged) {
          // Commit to a horizontal drag only on clear intent; a mostly
          // vertical move is a scroll the browser is about to take
          // over (pointercancel), so stand down early.
          if (Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx)) {
            drag.current = null;
            return;
          }
          if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy)) return;
          s.engaged = true;
          try {
            outerRef.current?.setPointerCapture(e.pointerId);
          } catch {
            // A pointer that can't be captured (already lifted, or
            // synthetic) still gets the drag — capture is only there
            // to keep moves flowing when the finger leaves the page.
          }
          setPeek({ top: window.scrollY });
        }
        s.dx = dx;
        setX(dx);
      }}
      onPointerUp={(e) => {
        const s = drag.current;
        drag.current = null;
        if (!s || e.pointerId !== s.id || !s.engaged || !pager) return;
        const w = outerRef.current?.clientWidth ?? window.innerWidth;
        const quick = performance.now() - s.t < 300 && Math.abs(s.dx) > 56;
        if (Math.abs(s.dx) > 0.28 * w || quick) {
          const dir: 1 | -1 = s.dx < 0 ? 1 : -1;
          // Finish the turn visually, then swap in the real route.
          drag.current = s; // keep dx for settle()'s from-frame
          settle(-dir * w, () => {
            drag.current = null;
            setPeek(null);
            setX(0);
            pager.go(dir, false);
          });
        } else {
          drag.current = s;
          settle(0, () => {
            drag.current = null;
            setPeek(null);
          });
        }
      }}
      onPointerCancel={() => {
        // The browser took the gesture (vertical scroll): snap home.
        if (drag.current?.engaged) {
          settle(0, () => setPeek(null));
        }
        drag.current = null;
      }}
    >
      {/* Chevron/keyboard navigation slides the incoming page in from
          its side; a completed drag already played the turn, so it
          arrives with no pagerDir and mounts static. Reduced motion
          mounts static too (motion animations are JS-driven — the
          global CSS 0.01ms rule cannot shorten them; this branch is
          the off switch). */}
      <motion.div
        initial={dirIn && !reduced ? { x: dirIn * 32, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div ref={trackRef} className="relative w-full">
          <div data-level={accent} className={className}>
            {children}
          </div>
          {peek && pager && (
            <>
              <PeekPane
                gameId={pager.prevId}
                page={page}
                side={-1}
                top={peek.top}
              />
              <PeekPane
                gameId={pager.nextId}
                page={page}
                side={1}
                top={peek.top}
              />
            </>
          )}
        </div>
      </motion.div>
    </div>
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
  const { go, name, nameOf, prevId, nextId } = pager;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => go(-1, true)}
        aria-label={`previous game: ${nameOf(prevId)}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:scale-90 after:absolute after:-inset-1"
      >
        <ChevronLeft aria-hidden className="h-5 w-5" />
      </button>
      <span className="text-sm font-semibold text-accent">{name}</span>
      <button
        type="button"
        onClick={() => go(1, true)}
        aria-label={`next game: ${nameOf(nextId)}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:scale-90 after:absolute after:-inset-1"
      >
        <ChevronRight aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );
}
