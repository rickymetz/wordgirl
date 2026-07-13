import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { formatDuration, formatShareDate } from "../../../lib/date";
import { SHARE_URL } from "../../../lib/share";
import { ShareButton } from "../../../components/ShareButton";
import { useModalFocus } from "../../../components/useModalFocus";

function buildShareText(
  words: number,
  glyphs: number,
  dateKey: string,
  elapsedMs: number,
): string {
  const date = formatShareDate(dateKey);
  const glyphPart = glyphs > 0 ? ` · ✦${glyphs}` : "";
  return [
    `Backwords — ${date}`,
    `${words} words · ⏱️ ${formatDuration(elapsedMs)}${glyphPart}`,
    SHARE_URL,
  ].join("\n");
}

/** Results card — the timer is hidden during play and revealed here. */
export function SolvedOverlay({
  words,
  glyphs,
  mode,
  dateKey,
  elapsedMs,
  open,
  onClose,
  onNewPuzzle,
  onReplay,
}: {
  /** Rows placed (each row is one word you found; its mirror is free). */
  words: number;
  /** ✦ rows — placements a real mirror would render. */
  glyphs: number;
  mode: "daily" | "practice" | "archive";
  /** Set for daily/archive — enables the share button. */
  dateKey?: string;
  /** Frozen solve time from the hook (single source of truth). */
  elapsedMs: number | null;
  open: boolean;
  onClose: () => void;
  onNewPuzzle?: () => void;
  onReplay?: () => void;
}) {
  const [confirmReplay, setConfirmReplay] = useState(false);
  const dialogRef = useModalFocus<HTMLDivElement>(open);
  const reducedMotion = useReducedMotion();

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-center justify-center bg-surface/90 px-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        data-autofocus
        role="dialog"
        aria-modal="true"
        aria-labelledby="solved-dialog-title"
        className="relative w-full max-w-sm rounded-3xl border border-line bg-surface-raised p-8 text-center shadow-xl outline-none md:max-w-md"
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="view board"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:scale-90"
        >
          <X aria-hidden className="h-5 w-5" />
        </button>
        <div
          id="solved-dialog-title"
          className="text-sm font-semibold tracking-widest text-ink-soft uppercase"
        >
          {mode === "daily" ? "Daily solved" : "Puzzle solved"}
        </div>
        {/* The reveal: the clock ran silently — here's your line. */}
        {elapsedMs !== null && (
          <div className="mt-2 font-game text-4xl text-accent">
            {formatDuration(elapsedMs)}
          </div>
        )}
        <div className="mt-2 text-ink-soft">
          {words} {words === 1 ? "word" : "words"}
        </div>
        {glyphs > 0 && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft">
              <Sparkles aria-hidden className="h-3.5 w-3.5 text-accent" />
              {glyphs} true mirror {glyphs === 1 ? "row" : "rows"}
            </span>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          {dateKey && elapsedMs !== null && (
            <ShareButton text={buildShareText(words, glyphs, dateKey, elapsedMs)} gameId="backwords" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-accent py-3 font-semibold text-surface touch-manipulation select-none active:scale-95"
            onPointerDown={(e) => e.preventDefault()}
          >
            View Puzzle
          </button>
          {mode === "practice" && onNewPuzzle && (
            <button
              type="button"
              onClick={onNewPuzzle}
              className="rounded-full border border-line py-3 font-semibold active:scale-95"
            >
              New puzzle
            </button>
          )}
          {mode === "archive" && onReplay && !confirmReplay && (
            <button
              type="button"
              onClick={() => setConfirmReplay(true)}
              className="rounded-full border border-line py-3 font-semibold active:scale-95"
            >
              Replay puzzle
            </button>
          )}
          {mode === "archive" && onReplay && confirmReplay && (
            <div className="rounded-2xl border border-line p-3">
              <p className="text-sm text-ink-soft">
                Replaying replaces this day's saved result.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onReplay}
                  className="flex-1 rounded-full bg-accent py-2 text-sm font-semibold text-surface active:scale-95"
                >
                  Replay
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReplay(false)}
                  className="flex-1 rounded-full border border-line py-2 text-sm font-semibold active:scale-95"
                >
                  Keep result
                </button>
              </div>
            </div>
          )}
          {mode === "archive" && (
            <Link
              to="/games/backwords/archive"
              className="rounded-full border border-line py-3 font-semibold active:scale-95"
            >
              More past puzzles
            </Link>
          )}
          <Link
            to="/"
            className="rounded-full border border-line py-3 font-semibold active:scale-95"
          >
            Back to WordGirl
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
