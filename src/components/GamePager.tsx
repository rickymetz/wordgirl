import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { games } from "../games/registry";

/**
 * Carousel between the five games' parallel pages (archive ↔ archive,
 * stats ↔ stats): drag left/right anywhere on the page — the page
 * follows the finger while the neighboring game's REAL page peeks in
 * from that side — or use the chevrons beside the title. Cycles in
 * registry order with wrap-around; every game reaches both pages by
 * the checklist, so the cycle can never 404 (GamePager.test.ts).
 *
 * Because a page can now mount INVISIBLY as a neighbor preview, the
 * archive/stats pages must keep their mount side-effect-free: no
 * analytics, no writes, nothing that counts a view. A page that logs
 * on mount would log five times per drag.
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
    // replace, not push: these are lateral moves between five parallel
    // views of one screen — tabs, not destinations. A wrap-around lap
    // under push left five duplicate history entries for the platform
    // back gesture to walk through; back should return to wherever the
    // player CAME FROM instead. pagerDir tells the incoming page which
    // side to slide in from — the chevron path only; a completed drag
    // already animated the turn and mounts static.
    void navigate(`/games/${dir === 1 ? nextId : prevId}/${page}`, {
      replace: true,
      state: slide ? { pagerDir: dir } : undefined,
    });
  };
  return { go, prevId, nextId, name: self.name, nameOf };
}

/**
 * A neighbor's real page, mounted only while a drag is engaged, as a
 * non-interactive preview beside the current one. It renders its own
 * accent, header and data; inert + aria-hidden keep it out of focus
 * and the a11y tree until it becomes the real page. The fallback
 * mirrors the router's, for the cold-cache case where the neighbor's
 * chunk is still downloading mid-drag.
 */
function PeekPane({
  gameId,
  page,
  side,
  top,
  pitch,
}: {
  gameId: string;
  page: PagerPage;
  side: 1 | -1;
  top: number;
  pitch: number;
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
      style={{ left: side * pitch, top, maxHeight: "100dvh" }}
    >
      <Suspense
        fallback={
          <div className="flex justify-center pt-24 text-ink-soft">
            Loading…
          </div>
        }
      >
        <Page />
      </Suspense>
    </div>
  );
}

/** Drag bookkeeping lives in refs: frames write the track transform
 * straight to the DOM (house drag rule — never setState per frame). */
interface DragState {
  id: number;
  x: number;
  y: number;
  t: number;
  engaged: boolean;
  dx: number;
  /** The turn distance: min(viewport, content column + gutter). On
   * phones that is the viewport; on wide screens it keeps the neighbor
   * column arriving BESIDE the current one instead of trailing ~300px
   * of empty margin across a 1280px settle. Peek offset and settle
   * target share this one number, so the swap stays seamless. */
  pitch: number;
}

/**
 * The swipeable page shell around the archive/stats pages' column div
 * (its className moves one level down onto the pane; the wrapper chain
 * stays flex so the column's `grow` still reaches #root). Touch and
 * pen only: a mouse drag is text selection, not a page turn.
 * touch-pan-y leaves vertical scrolling to the browser (a scroll fires
 * pointercancel and cleanly aborts the drag) while horizontal movement
 * stays ours; overflow-x CLIP, not hidden — clip doesn't create a
 * scroll container, so page scrolling and scrollIntoView behave, and
 * overflow-y may stay visible.
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
  /** The in-flight settle. Exactly one may exist; whoever starts a new
   * gesture or unmounts the component must end it first — an owned
   * animation can never navigate a page the user has already left. */
  const animRef = useRef<Animation | null>(null);
  /** Swallow the click a touch sequence can still synthesize after an
   * engaged drag: browser tap-slop is engine-dependent, and the
   * calendar is a mesh of Links — a spring-back must never also open
   * a day. */
  const swallowClickRef = useRef(false);
  // One state flip per drag mounts the two peek panes; every frame
  // after that is a direct transform write. The flip mounts two full
  // neighbor pages (data loads and all) on the engage frame — the
  // price of previewing REAL pages; their loads are localStorage-fast.
  const [peek, setPeek] = useState<{ top: number; pitch: number } | null>(
    null,
  );

  useEffect(
    () => () => {
      // Unmount ends any settle WITHOUT its callback (cancel never
      // fires onfinish) — the navigate-after-unmount hole.
      animRef.current?.cancel();
      animRef.current = null;
    },
    [],
  );

  const setX = (x: number) => {
    if (trackRef.current)
      trackRef.current.style.transform = `translateX(${x}px)`;
  };

  const settle = (from: number, toX: number, after?: () => void) => {
    const track = trackRef.current;
    if (!track) return;
    if (reduced) {
      // The finger-following drag is direct manipulation and stays;
      // the settle tween is the animation, so under reduce it jumps.
      // (Neither MotionConfig nor the global CSS 0.01ms rule reaches
      // Element.animate() — this branch is the only off switch here.)
      setX(toX);
      after?.();
      return;
    }
    const anim = track.animate(
      [
        { transform: `translateX(${from}px)` },
        { transform: `translateX(${toX}px)` },
      ],
      { duration: 180, easing: "ease-out", fill: "forwards" },
    );
    animRef.current = anim;
    anim.onfinish = () => {
      // Ownership check: a newer gesture or settle took over.
      if (animRef.current !== anim) return;
      animRef.current = null;
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
      className="relative flex w-full grow flex-col touch-pan-y touch-pinch-zoom [overflow-x:clip]"
      onClickCapture={(e) => {
        if (swallowClickRef.current) {
          swallowClickRef.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerDown={(e) => {
        if (!pager || e.pointerType === "mouse") return;
        // First pointer owns the gesture; a second finger must not
        // steal or corrupt it (it stranded the track mid-drag).
        if (drag.current) return;
        swallowClickRef.current = false;
        // A settle still running? Jump it to its end — commit settles
        // navigate NOW instead of eating this gesture, spring-backs
        // just land home.
        animRef.current?.finish();
        drag.current = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          t: performance.now(),
          engaged: false,
          dx: 0,
          pitch: 0,
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
          const outer = outerRef.current;
          const w = outer?.clientWidth ?? window.innerWidth;
          const col =
            trackRef.current?.firstElementChild?.clientWidth ?? w;
          s.pitch = Math.min(w, col + 24);
          try {
            outer?.setPointerCapture(e.pointerId);
          } catch {
            // A pointer that can't be captured (already lifted, or
            // synthetic) still gets the drag — capture only keeps
            // moves flowing when the finger leaves the page.
          }
          setPeek({
            top:
              window.scrollY -
              (outer ? outer.getBoundingClientRect().top + window.scrollY : 0),
            pitch: s.pitch,
          });
        }
        s.dx = dx;
        setX(dx);
      }}
      onPointerUp={(e) => {
        const s = drag.current;
        if (!s || e.pointerId !== s.id) return;
        drag.current = null;
        if (!s.engaged || !pager) return;
        swallowClickRef.current = true;
        const quick = performance.now() - s.t < 300 && Math.abs(s.dx) > 56;
        if (Math.abs(s.dx) > 0.28 * s.pitch || quick) {
          const dir: 1 | -1 = s.dx < 0 ? 1 : -1;
          // Finish the turn visually, then swap in the real route.
          settle(s.dx, -dir * s.pitch, () => {
            setPeek(null);
            setX(0);
            pager.go(dir, false);
          });
        } else {
          settle(s.dx, 0, () => setPeek(null));
        }
      }}
      onPointerCancel={(e) => {
        // The browser took the gesture (vertical scroll): snap home.
        const s = drag.current;
        if (!s || e.pointerId !== s.id) return;
        drag.current = null;
        if (s.engaged) settle(s.dx, 0, () => setPeek(null));
      }}
      onLostPointerCapture={() => {
        // Abnormal capture loss with a live drag (pointerup already
        // clears drag.current on the normal path): don't strand the
        // track off-center.
        const s = drag.current;
        if (s?.engaged) {
          drag.current = null;
          settle(s.dx, 0, () => setPeek(null));
        }
      }}
    >
      {/* Chevron navigation slides the incoming page in from its side;
          a completed drag already played the turn, so it arrives with
          no pagerDir and mounts static — as does reduced motion
          (MotionConfig reducedMotion="user" in App.tsx zeroes the x;
          this branch also skips the opacity fade it would keep). */}
      <motion.div
        className="flex grow flex-col"
        initial={dirIn && !reduced ? { x: dirIn * 32, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div ref={trackRef} className="relative flex w-full grow flex-col">
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
                pitch={peek.pitch}
              />
              <PeekPane
                gameId={pager.nextId}
                page={page}
                side={1}
                top={peek.top}
                pitch={peek.pitch}
              />
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * The title-row control: ‹ GameName ›. Each chevron is a 36px box with
 * a 44px hit area (after:-inset-1); the game name sits BETWEEN them,
 * so the two hit areas are nowhere near each other — the adjacency to
 * watch is vertical, against the header row above, which the touch
 * audit measures (never class arithmetic). min-w-0 + truncate on the
 * name keep both chevrons on-screen at 320px + Huge text — an
 * overflow-clipped page cannot scroll a control back into reach.
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
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={() => go(-1, true)}
        aria-label={`previous game — ${nameOf(prevId)}`}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft active:scale-90 after:absolute after:-inset-1"
      >
        <ChevronLeft aria-hidden className="h-5 w-5" />
      </button>
      <span className="min-w-0 truncate text-sm font-semibold text-accent">
        {name}
      </span>
      <button
        type="button"
        onClick={() => go(1, true)}
        aria-label={`next game — ${nameOf(nextId)}`}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft active:scale-90 after:absolute after:-inset-1"
      >
        <ChevronRight aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );
}
