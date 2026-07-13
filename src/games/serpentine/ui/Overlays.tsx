import { useState } from "react";
import { Route, Undo2, Grid3X3, CircleHelp, Lightbulb } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { ShareButton } from "../../../components/ShareButton";
import { ModalDialog } from "../../../components/ModalDialog";
import { CoachSheet, Key } from "../../../components/CoachSheet";
import { formatDateKey, formatDuration, formatShareDate } from "../../../lib/date";
import { SHARE_URL } from "../../../lib/share";
import type { Difficulty, PuzzleDef } from "../engine/types";

interface SolvedProps {
  puzzle: PuzzleDef;
  difficulty: Difficulty;
  dateKey?: string;
  elapsedMs: number | null;
  open: boolean;
  onClose: () => void;
  onNewPuzzle?: () => void;
  onReplay?: () => Promise<void>;
}

function buildShareText(
  puzzle: PuzzleDef,
  difficulty: Difficulty,
  dateKey: string | undefined,
  elapsedMs: number | null,
): string {
  const title = `Serpentine${dateKey ? ` — ${formatShareDate(dateKey)}` : ""}`;
  const label = difficulty === "haiku" ? "Haiku" : "Poem";
  const time = elapsedMs !== null ? ` in ${formatDuration(elapsedMs)}` : "";
  return `${title}\n${label}: ${puzzle.path.length} letters${time} 🐍\n\n${SHARE_URL}`;
}

export function SolvedOverlay({
  puzzle,
  difficulty,
  dateKey,
  elapsedMs,
  open,
  onClose,
  onNewPuzzle,
  onReplay,
}: SolvedProps) {
  const shareText = buildShareText(puzzle, difficulty, dateKey, elapsedMs);
  const [confirmReplay, setConfirmReplay] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <ModalDialog labelledBy="serpentine-results" onClose={onClose}>
          <div
            className="flex flex-col items-center gap-4 p-6"
            data-autofocus
            tabIndex={-1}
          >
            <h2
              id="serpentine-results"
              className="text-xl font-bold tracking-tight"
            >
              Solved
            </h2>

            {dateKey && (
              <p className="text-sm text-ink-soft">
                {formatDateKey(dateKey)}
              </p>
            )}

            <div className="flex gap-6 text-center">
              {elapsedMs !== null && (
                <div>
                  <div className="text-2xl font-bold text-accent">
                    {formatDuration(elapsedMs)}
                  </div>
                  <div className="text-xs text-ink-soft">time</div>
                </div>
              )}
              <div>
                <div className="text-2xl font-bold text-accent">
                  {puzzle.rows}×{puzzle.cols}
                </div>
                <div className="text-xs text-ink-soft">grid</div>
              </div>
            </div>

            {/* Revealed phrase */}
            <div className="flex w-full flex-col gap-1.5 rounded-xl bg-surface-tint p-4">
              <p className="text-center text-sm font-medium text-ink">
                {puzzle.text}
              </p>
              <p className="text-center text-xs font-medium text-ink-soft italic">
                {puzzle.title}
              </p>
            </div>

            {dateKey && <ShareButton text={shareText} gameId="serpentine" />}

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-surface touch-manipulation select-none active:scale-95"
              onPointerDown={(e) => e.preventDefault()}
            >
              View Puzzle
            </button>
            {onNewPuzzle && (
              <button
                type="button"
                onClick={onNewPuzzle}
                className="rounded-full border border-line px-6 py-2 text-sm font-semibold touch-manipulation active:scale-95"
                onPointerDown={(e) => e.preventDefault()}
              >
                New puzzle
              </button>
            )}
            {onReplay && !confirmReplay && (
              <button
                type="button"
                onClick={() => setConfirmReplay(true)}
                className="rounded-full border border-line px-6 py-2 text-sm font-semibold touch-manipulation active:scale-95"
                onPointerDown={(e) => e.preventDefault()}
              >
                Play again
              </button>
            )}
            {onReplay && confirmReplay && (
              <div className="rounded-2xl border border-line p-3">
                <p className="text-sm text-ink-soft">
                  Replaying replaces this day's saved result.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void onReplay()}
                    className="flex-1 rounded-full bg-accent py-2 text-sm font-semibold text-surface active:scale-95"
                    onPointerDown={(e) => e.preventDefault()}
                  >
                    Replay
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReplay(false)}
                    className="flex-1 rounded-full border border-line py-2 text-sm font-semibold active:scale-95"
                    onPointerDown={(e) => e.preventDefault()}
                  >
                    Keep result
                  </button>
                </div>
              </div>
            )}
          </div>
        </ModalDialog>
      )}
    </AnimatePresence>
  );
}

interface CoachProps {
  open: boolean;
  onClose: () => void;
}

export function SerpentineCoach({ open, onClose }: CoachProps) {
  return (
    <AnimatePresence>
      {open && (
        <CoachSheet
          onClose={onClose}
          rules={[
            {
              Icon: Route,
              title: "Trace the path",
              body: (
                <>
                  Find a <Key>single continuous path</Key> through the
                  grid. The path snakes through adjacent cells —
                  horizontally, vertically, or <Key>diagonally</Key>.
                </>
              ),
            },
            {
              Icon: Grid3X3,
              title: "Cover every letter",
              body: (
                <>
                  The puzzle is solved when every letter is on the path.
                  The path <Key>length</Key> is shown below the grid.
                </>
              ),
            },
            {
              Icon: Undo2,
              title: "Tap and drag",
              body: (
                <>
                  <Key>Tap</Key> a cell to extend the path, or{" "}
                  <Key>drag</Key> through cells. Tap a placed cell to
                  undo back to it.
                </>
              ),
            },
            {
              Icon: Lightbulb,
              title: "Use hints",
              body: (
                <>
                  Tap <Key>Hint</Key> to highlight cells where words begin in
                  the hidden phrase.
                </>
              ),
            },
            {
              Icon: CircleHelp,
              title: "Hidden phrase",
              body: (
                <>
                  The path spells a hidden phrase. The puzzle{" "}
                  <Key>title</Key> is your only clue. The phrase is
                  revealed when the puzzle is complete.
                </>
              ),
            },
          ]}
        />
      )}
    </AnimatePresence>
  );
}
