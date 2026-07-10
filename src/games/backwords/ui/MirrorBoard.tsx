import { AnimatePresence, motion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { useViewport } from "../../../lib/useViewport";
import type { CommittedRow } from "../state/reducer";

/**
 * The board: every row lies against one central mirror pane. The
 * player's TILES sit left of the glass — the same tiles that left the
 * rack, flown here by layoutId — and the reflection renders as ghost
 * tiles inside the glass. Odd palindromes put their middle tile ON
 * the line. Breaking a row flies its tiles back to the rack.
 */
export interface DragGhost {
  letter: string;
  /** Position inside the glass, relative to the pane's top-left. */
  paneX: number;
  y: number;
}

export function MirrorBoard({
  rows,
  current,
  currentStraddle,
  solved,
  bankAll,
  dragGhost,
  onBreakRow,
  onUnstage,
  onDragLive,
}: {
  rows: CommittedRow[];
  current: string;
  /** The staged letters already read as an odd palindrome's half —
   * preview the straddle live (middle tile on the glass). */
  currentStraddle: boolean;
  solved: boolean;
  /** puzzle.bank — for assigning each placed letter its rack tile. */
  bankAll: string[];
  /** A tile in flight: its live reflection tracks it in the glass. */
  dragGhost: DragGhost | null;
  onBreakRow: (index: number) => void;
  /** Drag a staged tile off the board — it returns to the rack. */
  onUnstage: (index: number) => void;
  /** Stream drag positions so the mirror can reflect the tile live. */
  onDragLive: (letter: string | null, e?: PointerEvent) => void;
}) {
  const { vw } = useViewport();
  // One tile size for the whole board, sized so the longest row fits
  // its half — long placements (DRAWER…) shrink everything in step.
  const halfW = (Math.min(vw, 448) - 40) / 2 - 12;
  const longest = Math.max(
    3,
    ...rows.map((r) => r.place.length),
    current.length + 1,
  );
  const tile = Math.max(
    18,
    Math.min(34, Math.floor((halfW - (longest - 1) * 3) / longest)),
  );

  // Which rack tile does each placed letter occupy? Matches the rack's
  // dimming rule (last duplicates leave first), so layoutIds agree.
  const seq = [...rows.flatMap((r) => [...r.place]), ...current];
  const ids = assignTileIds(bankAll, seq);
  let at = 0;
  const idsFor = (n: number) => ids.slice(at, (at += n));

  return (
    <div
      id="bw-mirror"
      className="relative flex max-h-[26rem] min-h-52 w-full grow flex-col justify-center select-none"
    >
      {/* The glass: a filled pane behind the reflections, with a
          diagonal sheen — tokens only, so it re-tints per theme. */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 left-1/2 rounded-r-2xl"
        style={{
          background: `linear-gradient(105deg,
            color-mix(in oklab, var(--color-accent) 18%, var(--color-surface)) 0%,
            color-mix(in oklab, var(--color-accent) 7%, var(--color-surface)) 42%,
            color-mix(in oklab, var(--color-accent) 15%, var(--color-surface)) 55%,
            color-mix(in oklab, var(--color-accent) 6%, var(--color-surface)) 100%)`,
        }}
      />
      {/* The pane's edge — the line tiles press up against. */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-accent/60"
      />
      {/* The live reflection of a tile in flight: mirrored across the
          glass, converging on the dragged tile as it nears the line. */}
      {dragGhost && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 left-1/2 z-20 overflow-hidden rounded-r-2xl"
        >
          <span
            className="absolute flex h-[55px] w-[45px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-surface/50 font-game text-xl text-ink-soft/80 uppercase shadow-sm"
            style={{ left: dragGhost.paneX, top: dragGhost.y }}
          >
            {dragGhost.letter}
          </span>
        </div>
      )}
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
                straddle={
                  row.def.kind === "palindrome" &&
                  row.def.words[0].length % 2 === 1
                }
                glyph={row.def.glyph}
                committed
                onBreak={solved ? undefined : () => onBreakRow(i)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {!solved && (
          <Row
            place={current}
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
  ids: number[];
  tile: number;
  straddle?: boolean;
  glyph?: boolean;
  committed?: boolean;
  active?: boolean;
  onBreak?: () => void;
  onUnstage?: (index: number) => void;
  onDragLive?: (letter: string | null, e?: PointerEvent) => void;
}) {
  const left = straddle ? place.slice(0, -1) : place;
  const middle = straddle ? place[place.length - 1] : null;
  const reflection = [...left].reverse().join("");
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
      <div className="flex flex-1 items-center justify-end gap-[3px] pr-2.5">
        {onBreak && (
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onBreak}
            aria-label={`take back ${place}`}
            className="relative mr-2 flex h-6 w-6 items-center justify-center rounded-full text-ink-soft after:absolute after:-inset-2.5 after:content-[''] active:scale-90"
          >
            <X aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        )}
        {glyph && committed && (
          <Sparkles
            aria-label="true mirror row"
            className="mr-1 h-4 w-4 shrink-0 text-accent"
          />
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
            id={ids[ids.length - 1]}
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
        className="flex flex-1 items-center gap-[3px] pl-2.5"
      >
        {active && place.length === 0 && (
          <span
            className="rounded-lg border-2 border-dashed border-ink-soft/25"
            style={tileStyle}
          />
        )}
        {[...reflection].map((ch, i) => (
          // 8. one legibility step up: this is how the second word reads
          <span
            key={i}
            className="flex items-center justify-center rounded-lg bg-surface/50 text-ink-soft/80"
            style={tileStyle}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A rack tile that traveled to the board — layoutId flies it here.
 * Staged (uncommitted) tiles can be dragged back off the board. */
function PlacedTile({
  id,
  letter,
  active,
  style,
  onGlass = false,
  onUnstage,
  onDragLive,
}: {
  id: number;
  letter: string;
  active: boolean;
  style: React.CSSProperties;
  onGlass?: boolean;
  onUnstage?: () => void;
  onDragLive?: (letter: string | null, e?: PointerEvent) => void;
}) {
  return (
    <motion.span
      layoutId={id >= 0 ? `bwtile-${id}` : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 34 }}
      drag={!!onUnstage}
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.25, zIndex: 40 }}
      onDrag={(e) => onDragLive?.(letter, e as PointerEvent)}
      onDragEnd={(e) => {
        onDragLive?.(null);
        // Dragged OFF the board? Back to the rack it goes.
        const board = document.getElementById("bw-board");
        const p = e as PointerEvent;
        if (!board || !onUnstage || p.clientX === undefined) return;
        const r = board.getBoundingClientRect();
        if (
          p.clientX < r.left ||
          p.clientX > r.right ||
          p.clientY < r.top ||
          p.clientY > r.bottom
        ) {
          onUnstage();
        }
      }}
      className={`flex shrink-0 items-center justify-center rounded-lg bg-tile font-game text-ink uppercase ${
        active ? "shadow-sm ring-1 ring-accent" : onGlass ? "shadow-md" : "shadow-sm"
      }`}
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
