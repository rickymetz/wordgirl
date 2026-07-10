import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { useViewport } from "../../../lib/useViewport";
import { isStraddle, reverse } from "../engine/types";
import type { CommittedRow } from "../state/reducer";
import { overBoard } from "./dragPoint";

type DragLive = (
  letter: string | null,
  e?: MouseEvent | TouchEvent | PointerEvent,
  info?: PanInfo,
) => void;

/**
 * The board: every row lies against one central mirror pane. The
 * player's TILES sit left of the glass — the same tiles that left the
 * rack, flown here by layoutId — and the reflection renders as ghost
 * tiles inside the glass. Odd palindromes put their middle tile ON
 * the line. Breaking a row flies its tiles back to the rack.
 */
export function MirrorBoard({
  rows,
  current,
  activePlace,
  currentStraddle,
  solved,
  bankAll,
  onBreakRow,
  onUnstage,
  onDragLive,
}: {
  rows: CommittedRow[];
  current: string;
  /** The canonical placement of the staged letters (current when no
   * alias applies): extras past it fill the reflection's slots. */
  activePlace: string;
  /** The staged letters already read as an odd palindrome's half —
   * preview the straddle live (middle tile on the glass). */
  currentStraddle: boolean;
  solved: boolean;
  /** puzzle.bank — for assigning each placed letter its rack tile. */
  bankAll: string[];
  onBreakRow: (index: number) => void;
  /** Drag a staged tile off the board — it returns to the rack. */
  onUnstage: (index: number) => void;
  /** Stream drag positions so the mirror can reflect the tile live. */
  onDragLive: DragLive;
}) {
  const { vw, vh, rem } = useViewport();
  // One tile size for the whole board. Every row's LEFT half must fit
  // inside its flex share or the row's midpoint walks off the pane
  // line — so the width budget subtracts what shares that half: the
  // take-back × rail on committed rows, the caret on the active row.
  // The chrome these constants encode (max-w-md, px-5, pr-2.5, h-6,
  // mr-2) is all rem-based, so the budget scales with Text size like
  // the height budget below — at Huge everything is 25% wider.
  const s = rem / 16;
  const halfW = (Math.min(vw, 448 * s) - 40 * s) / 2 - 12 * s;
  const RAIL = 36 * s; // take-back ×: 24px + 8px margin + slack
  const fit = (budget: number, n: number) =>
    Math.floor((budget - (n - 1) * 3) / n);
  const caps = [34, fit(halfW - 6 * s, Math.max(3, activePlace.length))];
  if (rows.length > 0) {
    const longest = Math.max(3, ...rows.map((r) => r.place.length));
    caps.push(fit(halfW - RAIL, longest));
  }
  // Height budget: all rows (committed + active) must fit what the
  // chrome leaves over, scaled with the Text-size setting — 7-row
  // days at Huge text shrink tiles instead of scrolling the page.
  const CHROME_H = 330;
  const availH = vh - CHROME_H * (rem / 16);
  const rowsShown = rows.length + (solved ? 0 : 1);
  caps.push(Math.floor((availH / rowsShown - 12) / 1.2));
  const tile = Math.max(12, Math.min(...caps));

  // Which rack tile does each placed letter occupy? Matches the rack's
  // dimming rule (last duplicates leave first), so layoutIds agree.
  const seq = [...rows.flatMap((r) => [...r.place]), ...current];
  const ids = assignTileIds(bankAll, seq);
  let at = 0;
  const idsFor = (n: number) => ids.slice(at, (at += n));

  return (
    <div
      id="bw-mirror"
      className="relative flex max-h-[26rem] min-h-52 w-full grow touch-manipulation flex-col justify-center select-none"
    >
      {/* The glass: a filled pane behind the reflections, with a
          diagonal sheen — the shared --backwords-glass token, so it
          re-tints per theme and matches the hub card. */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 left-1/2 rounded-r-2xl"
        style={{ background: "var(--backwords-glass)" }}
      />
      {/* The pane's edge — the line tiles press up against. */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-accent/60"
      />
      {/* The live reflection of a tile in flight: the pointer mirrored
          across the line, so it converges on the dragged tile at the
          glass and works from either side — drag over the board and
          the twin swims in the pane; drag inside the glass and it
          surfaces on the board side. GameScreen positions it with
          direct DOM writes (per-frame React state would re-render the
          board mid-drag and corrupt the drag itself). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-r-2xl"
      >
        <span
          id="bw-drag-ghost"
          style={{ display: "none" }}
          className="absolute flex h-[55px] w-[45px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-surface/70 font-game text-xl text-ink-soft uppercase shadow-sm"
        />
      </div>
      <div className="relative flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {rows.map((row, i) => (
            <motion.div
              key={row.def.words.join("/")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Row
                place={row.place}
                ids={idsFor(row.place.length)}
                tile={tile}
                straddle={isStraddle(row.def)}
                glyph={row.def.glyph}
                committed
                onBreak={solved ? undefined : () => onBreakRow(i)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {!solved && (
          <Row
            place={activePlace}
            extras={current.slice(activePlace.length)}
            ids={idsFor(current.length)}
            tile={tile}
            straddle={currentStraddle}
            active
            onUnstage={onUnstage}
            onDragLive={onDragLive}
          />
        )}
      </div>
    </div>
  );
}

function Row({
  place,
  extras = "",
  ids,
  tile,
  straddle = false,
  glyph = false,
  committed = false,
  active = false,
  onBreak,
  onUnstage,
  onDragLive,
}: {
  place: string;
  /** Staged letters past the canonical placement (POO's second O):
   * they sit IN the reflection's slots as real tiles until commit. */
  extras?: string;
  ids: number[];
  tile: number;
  straddle?: boolean;
  glyph?: boolean;
  committed?: boolean;
  active?: boolean;
  onBreak?: () => void;
  onUnstage?: (index: number) => void;
  onDragLive?: DragLive;
}) {
  const left = straddle ? place.slice(0, -1) : place;
  const middle = straddle ? place[place.length - 1] : null;
  const reflection = reverse(left);
  const tileStyle = {
    width: tile,
    height: Math.round(tile * 1.2),
    fontSize: Math.max(11, Math.round(tile * 0.5)),
  };

  return (
    <div
      className="flex items-center font-game uppercase"
      style={{ minHeight: Math.round(tile * 1.2) + 4 }}
    >
      {/* Straddle rows drop the line-breathing padding: the middle
          slot's own 3px insets keep MOM at the board's tile rhythm. */}
      <div
        className={`flex min-w-0 flex-1 items-center justify-end gap-[3px] ${
          straddle ? "" : "pr-2.5"
        }`}
      >
        {onBreak && (
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onBreak}
            aria-label={`take back ${place}`}
            className="relative mr-2 flex h-6 w-6 shrink-0 touch-manipulation items-center justify-center rounded-full text-ink-soft after:absolute after:-inset-2.5 after:content-[''] active:scale-90"
          >
            <X aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        )}
        {[...left].map((ch, i) => (
          <PlacedTile
            key={ids[i]}
            id={ids[i]}
            letter={ch}
            active={active}
            style={tileStyle}
            onUnstage={onUnstage && (() => onUnstage(i))}
            onDragLive={onDragLive}
          />
        ))}
        {/* Empty active row: a dashed target socket teaches where the
            first tile lands (the rack's own empty-socket idiom). */}
        {active && place.length === 0 && (
          <span
            className="rounded-lg border-2 border-dashed border-line"
            style={tileStyle}
          />
        )}
        {active && (
          <span className="ml-0.5 inline-block h-5 w-[2px] animate-pulse rounded bg-accent" />
        )}
      </div>
      {/* The middle tile of an odd palindrome lives ON the line — its
          slot takes the tile's full width so the ghost beside it never
          collides. */}
      <span
        className="z-10 flex shrink-0 justify-center"
        style={{ width: middle ? tileStyle.width + 6 : 16 }}
      >
        {middle && (
          <PlacedTile
            // The MIDDLE letter's id — never ids[ids.length-1], which
            // is the last EXTRA's id when a palindrome is typed past
            // its half and would collide with the extras tile below.
            id={ids[place.length - 1]}
            letter={middle}
            active={active}
            style={tileStyle}
            onGlass
            onUnstage={onUnstage && (() => onUnstage(place.length - 1))}
            onDragLive={onDragLive}
          />
        )}
      </span>
      <div
        aria-hidden
        className={`flex min-w-0 flex-1 items-center gap-[3px] ${
          straddle ? "" : "pl-2.5"
        }`}
      >
        {active && place.length === 0 && (
          <span
            className="rounded-lg border-2 border-dashed border-ink-soft/25"
            style={tileStyle}
          />
        )}
        {[...reflection].map((ch, i) =>
          i < extras.length ? (
            // A staged letter typed past the fold: a REAL tile filling
            // the reflection's slot, handed back at commit when the
            // mirror takes over.
            <PlacedTile
              key={ids[place.length + i]}
              id={ids[place.length + i]}
              letter={extras[i]}
              active={active}
              style={tileStyle}
              punchOut
              onUnstage={onUnstage && (() => onUnstage(place.length + i))}
              onDragLive={onDragLive}
            />
          ) : (
            <ReflectionTile
              key={`g${i}`}
              letter={ch}
              style={tileStyle}
              // The ghost at reflection index i mirrors the tile at left
              // index (len-1-i): dragging it off the board unstages that
              // letter, so rows rework from either side of the glass.
              onUnstage={onUnstage && (() => onUnstage(left.length - 1 - i))}
              onDragLive={onDragLive}
            />
          ),
        )}
        {/* The mirror's seal: lives INSIDE the glass so it never eats
            the left half's tile budget. Decorative here — the commit
            toast and results carry the words. */}
        {glyph && committed && (
          <Sparkles className="ml-1 h-4 w-4 shrink-0 text-accent" />
        )}
      </div>
    </div>
  );
}

/** The drag wiring every board tile shares: stream the live mirror
 * while in flight, and treat a drop OUTSIDE the board as a take-back
 * (a cancelled gesture — overBoard null — is never a drop). */
function unstageDragProps(
  letter: string,
  onUnstage?: () => void,
  onDragLive?: DragLive,
) {
  return {
    drag: !!onUnstage,
    dragSnapToOrigin: true,
    dragMomentum: false,
    whileDrag: { scale: 1.25, zIndex: 40 },
    onDrag: (e: PointerEvent, info: PanInfo) => onDragLive?.(letter, e, info),
    onDragEnd: (e: PointerEvent, info: PanInfo) => {
      onDragLive?.(null);
      if (onUnstage && overBoard(e, info) === false) onUnstage();
    },
  };
}

/** A rack tile that traveled to the board — layoutId flies it here.
 * Staged (uncommitted) tiles can be dragged back off the board. */
function PlacedTile({
  id,
  letter,
  active,
  style,
  onGlass = false,
  punchOut = false,
  onUnstage,
  onDragLive,
}: {
  id: number;
  letter: string;
  active: boolean;
  style: React.CSSProperties;
  onGlass?: boolean;
  /** Sitting ON the tinted glass: punch out with bg-surface — never
   * bg-tile on tint (house rule). */
  punchOut?: boolean;
  onUnstage?: () => void;
  onDragLive?: DragLive;
}) {
  return (
    <motion.span
      layoutId={id >= 0 ? `bwtile-${id}` : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 34 }}
      {...unstageDragProps(letter, onUnstage, onDragLive)}
      className={`relative flex shrink-0 items-center justify-center rounded-lg font-game uppercase ${
        onGlass ? "" : punchOut ? "bg-surface text-ink" : "bg-tile text-ink"
      } ${
        active ? "shadow-sm ring-1 ring-accent" : onGlass ? "shadow-md" : "shadow-sm"
      }`}
      style={{ ...style, touchAction: onUnstage ? "none" : undefined }}
    >
      {onGlass ? (
        // The middle tile sits half in the glass: its left half wears
        // the real-tile treatment, its right half the reflection's —
        // seamed exactly on the mirror line it straddles.
        <>
          <span
            className="absolute inset-0 flex items-center justify-center rounded-lg bg-tile text-ink"
            style={{ clipPath: "inset(0 50% 0 0)" }}
          >
            {letter}
          </span>
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center rounded-lg bg-surface/70 text-ink-soft"
            style={{ clipPath: "inset(0 0 0 50%)" }}
          >
            {letter}
          </span>
        </>
      ) : (
        letter
      )}
    </motion.span>
  );
}

/** A reflection ghost inside the glass. In the active row it's as
 * grabbable as the tile it mirrors — drag it off the board and the
 * mirrored letter returns to the rack. */
function ReflectionTile({
  letter,
  style,
  onUnstage,
  onDragLive,
}: {
  letter: string;
  style: React.CSSProperties;
  onUnstage?: () => void;
  onDragLive?: DragLive;
}) {
  return (
    <motion.span
      data-bw-reflection={onUnstage ? "active" : "set"}
      {...unstageDragProps(letter, onUnstage, onDragLive)}
      className="flex shrink-0 items-center justify-center rounded-lg bg-surface/70 text-ink-soft"
      style={{ ...style, touchAction: onUnstage ? "none" : undefined }}
    >
      {letter}
    </motion.span>
  );
}

/**
 * Rack index for each placed letter occurrence, in placement order.
 * The rack empties its LAST duplicate sockets first, so the first
 * placed copy takes the last rack index — stable as more join.
 */
function assignTileIds(bankAll: string[], seq: string[]): number[] {
  const byLetter = new Map<string, number[]>();
  bankAll.forEach((ch, i) => {
    const list = byLetter.get(ch) ?? [];
    list.push(i);
    byLetter.set(ch, list);
  });
  const used: Record<string, number> = {};
  return seq.map((ch) => {
    const list = byLetter.get(ch) ?? [];
    const c = (used[ch] = (used[ch] ?? 0) + 1);
    return list[list.length - c] ?? -1;
  });
}
