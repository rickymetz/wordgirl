import {
  Suspense,
  startTransition,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
    // replace, not push: these are lateral moves between five parallel
    // views of one screen — tabs, not destinations. A wrap-around lap
    // under push left five duplicate history entries for the platform
    // back gesture to walk through; back should return to wherever the
    // player CAME FROM instead. pagerDir tells the incoming page which
    // side to slide in from — the chevron path only; a completed drag
    // already animated the turn and mounts static.
    void Promise.resolve(
      navigate(`/games/${dir === 1 ? nextId : prevId}/${page}`, {
        replace: true,
        // Synchronous route commit: a scheduler-paced commit leaves
        // painted frames between the drag's settled view and the new
        // page — visible as a flash of the old page on slow devices.
        flushSync: true,
        state: slide ? { pagerDir: dir } : undefined,
      }),
    ).then(() => {
      // The next page starts at its own top — AFTER the commit, so
      // the reset lands on the new page. Resetting first scrolled the
      // old page while it was still on screen under the settled peek.
      window.scrollTo(0, 0);
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

/**
 * Gesture tuning, in one place because these numbers decide whether the
 * pager feels like a page turn or like a trick you have to learn.
 *
 * The rule they encode: take the gesture on a clear horizontal intent,
 * and judge the release the way a native carousel does — by where the
 * page is HEADED (position plus momentum), not by distance alone.
 */
/** Horizontal travel that means "this is a page turn". */
const ENGAGE_SLOP = 10;
/** Vertical travel before a steep gesture reads as a scroll... */
const VERTICAL_SLOP = 14;
/** ...and how much steeper than 45° it has to be. A thumb PIVOTS around
 * its base, so the opening of a perfectly intentional side-swipe arcs
 * downward: at a bare 45° test that arc read as a scroll and the drag
 * was dropped before it began — the "only works if you swipe just so"
 * failure. Well past 45°, and it is a scroll. */
const VERTICAL_RATIO = 1.5;
/** Fraction of the pitch the projected landing must pass to turn. */
const COMMIT_FRACTION = 0.2;
/** A release this fast IS a page turn, whatever the distance — the
 * flick rule every native carousel has. Without it a flick lives or
 * dies by the projected-landing arithmetic, and a short one lands
 * within a few px of the line: the knife-edge that makes a pager feel
 * like it only works at one particular speed. px/ms, so 0.35 ≈ 350px/s. */
const FLING_VELOCITY = 0.35;
/** Travel below which nothing turns the page, on either path: the page
 * has barely moved, so this is a tap or a twitch, and a few px of
 * motion multiplied by a flick's velocity must not project its way
 * into a page turn. */
const MIN_TURN_TRAVEL = 24;
/** A cancelled gesture (the browser claimed it) turns the page only on
 * a plainly finished pull — no momentum credit, a longer pull. */
const CANCEL_COMMIT_FRACTION = 0.28;
/** How far ahead release velocity is projected. Short, like a flick's
 * own follow-through: it should reward a fling, not teleport a nudge. */
const FLING_PROJECTION_MS = 150;
/** A finger that stopped this long before lifting has no momentum —
 * without this, a drag that rests at the end still flings. */
const VELOCITY_IDLE_MS = 80;

export type DragIntent = "pending" | "horizontal" | "vertical";

/** What a gesture is so far, from its travel since touch-down. */
export function dragIntent(dx: number, dy: number): DragIntent {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ay > VERTICAL_SLOP && ay > ax * VERTICAL_RATIO) return "vertical";
  if (ax >= ENGAGE_SLOP) return "horizontal";
  return "pending";
}

/**
 * Which way the release turns the page, or 0 to spring back.
 *
 * Two ways to turn, because a page turn is two different gestures: a
 * FLICK (fast release, any distance) and a DRAG (far enough that the
 * page is more than half turned, however slowly it got there). The
 * old rule wanted either 109px of travel or a sub-300ms gesture
 * measured from touch-down, so an ordinary 80px swipe over 400ms met
 * neither and sprang back — and a slow drag that ended in a flick was
 * never "quick" at all. That gap is what made the pager feel like it
 * worked at one speed only.
 *
 * A finger that reverses at the end lands back where it started and
 * springs back, which is how a player cancels a turn in flight.
 */
export function commitDirection(
  { dx, vx, pitch }: { dx: number; vx: number; pitch: number },
  fraction: number = COMMIT_FRACTION,
): 1 | -1 | 0 {
  const dir: 1 | -1 = dx < 0 ? 1 : -1;
  if (Math.abs(dx) < MIN_TURN_TRAVEL) return 0;
  // Reversed out of the turn: whatever the numbers, they disagree.
  if (vx !== 0 && Math.sign(vx) !== Math.sign(dx)) return 0;
  if (Math.abs(vx) >= FLING_VELOCITY) return dir;
  return Math.abs(dx + vx * FLING_PROJECTION_MS) > fraction * pitch
    ? dir
    : 0;
}

/** Drag bookkeeping lives in refs: frames write the track transform
 * straight to the DOM (house drag rule — never setState per frame). */
interface DragState {
  id: number;
  x: number;
  y: number;
  engaged: boolean;
  dx: number;
  /** Last sample, for velocity: position, time, and the smoothed
   * px/ms it implies. */
  lastX: number;
  lastT: number;
  vx: number;
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
          engaged: false,
          dx: 0,
          lastX: e.clientX,
          lastT: performance.now(),
          vx: 0,
          pitch: 0,
        };
      }}
      onPointerMove={(e) => {
        const s = drag.current;
        if (!s || e.pointerId !== s.id) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        // Velocity, weighted hard toward the newest sample: a flick at
        // the END of a slow drag is a flick, and — the case that needs
        // the heavy weighting — a finger that DECELERATES to a stop
        // before lifting has changed its mind, which a gentler average
        // still reads as moving. The idle cutoff below only catches a
        // finger that stops sending moves at all.
        const now = performance.now();
        const dt = now - s.lastT;
        if (dt > 0) {
          const sample = (e.clientX - s.lastX) / dt;
          s.vx = s.vx === 0 ? sample : s.vx * 0.15 + sample * 0.85;
          s.lastX = e.clientX;
          s.lastT = now;
        }
        if (!s.engaged) {
          // Take the gesture on clear horizontal intent; a clearly
          // vertical one is a scroll the browser is about to take over
          // (pointercancel), so stand down early.
          const intent = dragIntent(dx, dy);
          if (intent === "vertical") {
            drag.current = null;
            return;
          }
          if (intent === "pending") return;
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
          // A transition, not an urgent update: the panes are two FULL
          // pages — on a populated stats page that is hundreds of SVG
          // nodes twice over — and rendering them synchronously inside
          // this pointermove freezes the main thread on the engage
          // frame, mid-gesture. iOS cancels touches whose page stops
          // responding, which killed populated-page swipes on real
          // phones while empty pages (nothing to render) worked.
          // Time-sliced, the panes arrive a frame or two later — they
          // start off-screen, so nobody sees the difference.
          const top =
            window.scrollY -
            (outer ? outer.getBoundingClientRect().top + window.scrollY : 0);
          const pitch = s.pitch;
          startTransition(() => setPeek({ top, pitch }));
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
        // A finger resting at the end of a drag carries no momentum.
        const vx = performance.now() - s.lastT > VELOCITY_IDLE_MS ? 0 : s.vx;
        const dir = commitDirection({ dx: s.dx, vx, pitch: s.pitch });
        if (dir !== 0) {
          // Finish the turn visually, then swap in the real route.
          // The settled view — neighbor's peek covering the screen —
          // STAYS until the destination page replaces this whole
          // subtree. Resetting the track or tearing the peeks down
          // here painted the OLD page back for however many frames
          // the router took to commit (the swipe flash); the remount
          // discards both anyway.
          settle(s.dx, -dir * s.pitch, () => pager.go(dir, false));
        } else {
          settle(s.dx, 0, () => setPeek(null));
        }
      }}
      onPointerCancel={(e) => {
        const s = drag.current;
        if (!s || e.pointerId !== s.id) return;
        drag.current = null;
        if (!s.engaged || !pager) return;
        // Usually the browser took the gesture for a vertical scroll:
        // snap home. But iOS can also cancel a touch late — after a
        // long horizontal pull, or when the page hitches — and past
        // the commit distance the player has plainly turned the page,
        // so finish the turn rather than snapping a completed gesture
        // back. No momentum credit here: a cancelled gesture's velocity
        // belongs to the scroll that took it.
        const dir = commitDirection(
          { dx: s.dx, vx: 0, pitch: s.pitch },
          CANCEL_COMMIT_FRACTION,
        );
        if (dir !== 0) {
          swallowClickRef.current = true;
          settle(s.dx, -dir * s.pitch, () => pager.go(dir, false));
        } else {
          settle(s.dx, 0, () => setPeek(null));
        }
      }}
      onLostPointerCapture={(e) => {
        // Only THIS element's capture counts. On real touch the
        // browser implicitly captures the pointer to the element
        // under the finger, and transferring it here (the
        // setPointerCapture above) fires lostpointercapture on that
        // inner element first — which BUBBLES through this handler
        // and, unguarded, killed every real-device drag the moment
        // it engaged. Synthetic test pointers never take implicit
        // capture, which is how that shipped.
        if (e.target !== e.currentTarget) return;
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
