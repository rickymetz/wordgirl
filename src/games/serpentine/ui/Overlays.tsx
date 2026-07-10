import { Route, Undo2, Grid3X3, CircleHelp } from "lucide-react";
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
}

function buildShareText(
  puzzle: PuzzleDef,
  difficulty: Difficulty,
  dateKey: string | undefined,
  elapsedMs: number | null,
): string {
  const title = `Serpentine${dateKey ? ` — ${formatShareDate(dateKey)}` : ""}`;
  const diff = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const time = elapsedMs !== null ? ` in ${formatDuration(elapsedMs)}` : "";
  return `${title}\n${diff}: ${puzzle.path.length} letters${time} 🐍\n\n${SHARE_URL}`;
}

export function SolvedOverlay({
  puzzle,
  difficulty,
  dateKey,
  elapsedMs,
  open,
  onClose,
}: SolvedProps) {
  const shareText = buildShareText(puzzle, difficulty, dateKey, elapsedMs);

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

            <ShareButton text={shareText} />
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
              title: "Cover every cell",
              body: (
                <>
                  The puzzle is solved when every cell is on the path.
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
