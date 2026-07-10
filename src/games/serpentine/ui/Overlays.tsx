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
  const snakeCount = puzzle.snakes.length === 1 ? "1 snake" : `${puzzle.snakes.length} snakes`;
  return `${title}\n${diff}: ${snakeCount}${time} 🐍\n\n${SHARE_URL}`;
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
              <div>
                <div className="text-2xl font-bold text-accent">
                  {puzzle.snakes.length}
                </div>
                <div className="text-xs text-ink-soft">
                  {puzzle.snakes.length === 1 ? "snake" : "snakes"}
                </div>
              </div>
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

            {/* Revealed phrases */}
            <div className="flex w-full flex-col gap-1.5 rounded-xl bg-surface-tint p-4">
              {puzzle.snakes.map((snake, i) => (
                <p key={i} className="text-center text-sm font-medium text-ink">
                  {snake.text}
                </p>
              ))}
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
              title: "Trace the snakes",
              body: (
                <>
                  Find <Key>continuous paths</Key> through the grid. Each
                  path snakes through adjacent cells — horizontally,
                  vertically, or <Key>diagonally</Key>.
                </>
              ),
            },
            {
              Icon: Grid3X3,
              title: "Cover every cell",
              body: (
                <>
                  The puzzle is solved when every cell belongs to a snake.
                  The number of snakes and their <Key>lengths</Key> are
                  shown below the grid.
                </>
              ),
            },
            {
              Icon: Undo2,
              title: "Tap and drag",
              body: (
                <>
                  <Key>Tap</Key> a cell to extend the active snake, or{" "}
                  <Key>drag</Key> through cells. Tap a placed cell to undo
                  back to it. Switch snakes with the labels below.
                </>
              ),
            },
            {
              Icon: CircleHelp,
              title: "Hidden phrases",
              body: (
                <>
                  Each snake spells a hidden phrase. The puzzle{" "}
                  <Key>title</Key> is your only clue. Phrases are revealed
                  when a snake is complete.
                </>
              ),
            },
          ]}
        />
      )}
    </AnimatePresence>
  );
}
