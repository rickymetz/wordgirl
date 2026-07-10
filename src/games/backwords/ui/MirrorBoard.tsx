import { AnimatePresence, motion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import type { CommittedRow } from "../state/reducer";

/**
 * The board: every row lies against one central mirror spine. The
 * player's letters sit LEFT of the glass; the reflection renders as
 * ghost letters on the right. Palindromes straddle it — an odd
 * middle letter sits ON the line and is shown once.
 *
 * Reflections are drawn in reading order (reversed), not as flipped
 * glyphs — the ✦ marks rows where a real mirror would agree.
 */
export function MirrorBoard({
  rows,
  current,
  solved,
  onBreakRow,
}: {
  rows: CommittedRow[];
  current: string;
  solved: boolean;
  onBreakRow: (index: number) => void;
}) {
  return (
    <div className="relative flex min-h-52 w-full flex-col justify-center select-none">
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
      {/* The pane's edge — the line letters press up against. */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-accent/60"
      />
      <div className="relative flex flex-col gap-2.5">
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
                // Odd palindromes put their middle letter ON the line.
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
        {!solved && <Row place={current} active />}
      </div>
    </div>
  );
}

function Row({
  place,
  straddle = false,
  glyph = false,
  committed = false,
  active = false,
  onBreak,
}: {
  place: string;
  straddle?: boolean;
  glyph?: boolean;
  committed?: boolean;
  active?: boolean;
  onBreak?: () => void;
}) {
  const left = straddle ? place.slice(0, -1) : place;
  const middle = straddle ? place[place.length - 1] : null;
  const reflection = [...left].reverse().join("");

  return (
    <div className="flex h-9 items-center font-game text-lg uppercase">
      <div className="flex flex-1 items-center justify-end gap-[3px] pr-3">
        {onBreak && (
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onBreak}
            aria-label={`take back ${place}`}
            className="relative mr-2 flex h-6 w-6 items-center justify-center rounded-full text-ink-soft after:absolute after:-inset-2 after:content-[''] active:scale-90"
          >
            <X aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        )}
        {glyph && committed && (
          <Sparkles
            aria-label="true mirror row"
            className="mr-1.5 h-4 w-4 shrink-0 text-accent"
          />
        )}
        {[...left].map((ch, i) => (
          <span key={i} className={committed ? "text-ink" : "text-accent"}>
            {ch}
          </span>
        ))}
        {active && (
          <span className="ml-0.5 inline-block h-5 w-[2px] animate-pulse rounded bg-accent" />
        )}
      </div>
      {/* The middle letter of an odd palindrome lives on the line. */}
      <span
        className={`z-10 w-4 shrink-0 text-center ${
          middle ? "text-ink" : "text-transparent"
        }`}
        aria-hidden={!middle}
      >
        {middle ?? "·"}
      </span>
      <div
        aria-hidden
        className="flex flex-1 items-center gap-[3px] pl-3 text-ink-soft/60"
      >
        {[...reflection].map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </div>
    </div>
  );
}
