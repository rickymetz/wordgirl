import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { formatDuration } from "../../../lib/date";
import { rankFor } from "../engine/scoring";

function buildShareText(
  found: number,
  total: number,
  hints: number,
  dateKey: string,
  elapsedMs: number,
): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  // Hints get the sheepish peek; a clean solve earns the nerd badge.
  const hintPart = hints > 0 ? ` · 🫣 ${hints}` : " · 🤓";
  return [
    `Crosshatch — ${date}`,
    `${rankFor(found, total)} · ${found}/${total} · ⏱️ ${formatDuration(elapsedMs)}${hintPart}`,
    window.location.host,
  ].join("\n");
}

/** Solve screen — appears at the 90% threshold, again at a perfect sweep. */
export function SolvedOverlay({
  found,
  total,
  hints,
  mode,
  dateKey,
  elapsedMs,
  open,
  onClose,
  onNewPuzzle,
  onReplay,
}: {
  found: number;
  total: number;
  /** Hint letters revealed today — marks the shared result. */
  hints: number;
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
  const [copied, setCopied] = useState(false);
  const [confirmReplay, setConfirmReplay] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  if (!open) return null;
  const perfect = found === total;

  const share = async () => {
    if (!dateKey || elapsedMs === null) return;
    const text = buildShareText(found, total, hints, dateKey, elapsedMs);
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // Dismissing the share sheet is a "changed my mind" — don't
        // hijack the clipboard and claim success.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — nothing useful to do.
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-center justify-center bg-surface/90 px-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="solved-dialog-title"
        className="relative w-full max-w-sm rounded-3xl border border-line bg-surface-raised p-8 text-center shadow-xl"
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="view puzzle"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full text-lg text-ink-soft active:scale-90"
        >
          ✕
        </button>
        <div
          id="solved-dialog-title"
          className="text-sm font-semibold tracking-widest text-ink-soft uppercase"
        >
          {perfect
            ? "Perfect sweep"
            : mode === "daily"
              ? "Daily solved"
              : "Puzzle solved"}
        </div>
        <div className="mt-2 text-4xl font-bold text-accent">
          {rankFor(found, total)}
        </div>
        <div className="mt-1 text-ink-soft">
          {found} of {total} words
        </div>
        {elapsedMs !== null && (
          <div className="mt-1 font-game text-lg text-accent">
            {formatDuration(elapsedMs)}
          </div>
        )}
        {hints > 0 && (
          <div className="mt-2">
            <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft">
              Used hint
            </span>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          {dateKey && (
            <button
              type="button"
              onClick={share}
              className="rounded-full bg-accent py-3 font-semibold text-surface active:scale-95"
            >
              {copied ? "Copied!" : "Share"}
            </button>
          )}
          {!perfect && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line py-3 font-semibold active:scale-95"
            >
              Keep hunting — {total - found} left
            </button>
          )}
          {mode === "practice" && onNewPuzzle && (
            <button
              type="button"
              onClick={onNewPuzzle}
              className="rounded-full bg-accent py-3 font-semibold text-surface active:scale-95"
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
              to="/games/crosshatch/archive"
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
