import "@fontsource/rubik-mono-one/latin-400.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CircleHelp, Undo2, Trash2, Lightbulb } from "lucide-react";
import { HomeLink } from "../../../components/HomeLink";
import { trackCoach, trackHint } from "../../../lib/analytics";
import { ShareButton } from "../../../components/ShareButton";
import { DailyOutro } from "../../../components/game/DailyOutro";
import { ConfettiOverlay } from "../../../components/ConfettiOverlay";
import { useSolveTransition } from "../../../lib/useSolveTransition";
import { useStorageBroken } from "../../../lib/useStorageBroken";
import { GameToast, useToast } from "../../../components/game/GameToast";
import { formatDateKey, formatDuration, formatShareDate, localDateKey } from "../../../lib/date";
import { SHARE_URL } from "../../../lib/share";
import {
  useSerpentineGame,
  type GameMode,
} from "../state/useSerpentineGame";
import {
  displayStreak,
  loadDailyProgress,
  loadStats,
  loadTutorialSeen,
  markTutorialSeen,
} from "../state/persistence";

import { SnakeGrid } from "./SnakeGrid";
import { SnakeText } from "./SnakeText";
import { SerpentineCoach } from "./Overlays";
import { PoemCredit } from "./PoemCredit";
import { cellKey, type Difficulty } from "../engine/types";
import { nextHintIndex, replayHints } from "../engine/hints";
import { wordStartIndices } from "../engine/phrase";
import { TutorialPrompt } from "../../../components/TutorialPrompt";
import { TutorialBanner } from "../../../components/game/TutorialBanner";
import { TutorialDone } from "../../../components/game/TutorialDone";
import { tutorialStepIndex } from "../engine/tutorial";
import { TUTORIAL_RECAP, TUTORIAL_STEPS } from "./tutorialSteps";

/** The streak `DailyOutro` shows — this game's own, read at the finish. */
const outroStreak = async (today: string) =>
  displayStreak(await loadStats(), today);

function buildShareText(
  puzzle: { path: { row: number; col: number }[]; text: string },
  difficulty: Difficulty,
  dateKey: string | undefined,
  elapsedMs: number | null,
  hints: number,
): string {
  const title = `🐍 Serpentine${dateKey ? ` — ${formatShareDate(dateKey)}` : ""}`;
  const label = difficulty === "haiku" ? "Haiku" : "Poem";
  const time = elapsedMs !== null ? ` · ⏱️ ${formatDuration(elapsedMs)}` : "";
  const hintPart = hints > 0 ? ` · 🫣 ${hints}` : " · 🤓 0";
  return `${title}\n${label} · ${puzzle.path.length} letters${time}${hintPart}\n${SHARE_URL}`;
}

const DIFF_LABELS: Record<Difficulty, string> = {
  haiku: "Haiku",
  poem: "Poem",
};

interface Props {
  mode: GameMode;
  difficulty?: Difficulty;
  onDifficultyChange?: (d: Difficulty) => void;
  onNewPuzzle?: () => void;
  onReplay?: () => Promise<void>;
  /** Tutorial: replay the script from step one. */
  onRestartTutorial?: () => void;
}

export function GameScreen({
  mode,
  difficulty,
  onDifficultyChange,
  onRestartTutorial,
}: Props) {
  const { state, dispatch, puzzle, solvedElapsedMs, hydratedAsSolved, hydratedHints, setHints } =
    useSerpentineGame(mode);
  const isTutorial = mode.kind === "tutorial";
  const isDaily = mode.kind === "daily";

  const storageBroken = useStorageBroken();
  const { showConfetti, showResults } = useSolveTransition(state.solved, hydratedAsSolved);

  // The tutorial's running instruction — deliberately NOT clamped forward
  // here, unlike the other games. Undoing is ordinary play in Serpentine,
  // and the steps are position-aware: backing off the diagonal should put
  // the diagonal lesson back up, and wandering off the path should return
  // to "tap a placed cell to undo back to it".
  const tutorialStep = tutorialStepIndex(state);

  const [coachOpen, setCoachOpen] = useState(false);
  const [hintedSet, setHintedSet] = useState<Set<number>>(new Set());
  const hintedRef = useRef(hintedSet);
  const hintCount = hintedSet.size;

  const { toast, show } = useToast();

  // The letters the puzzle gives: the first letter of every word.
  const givenIndices = useMemo(
    () => wordStartIndices(puzzle.text),
    [puzzle],
  );

  // Restore the hinted set from the saved count, ONCE. hydratedHints
  // reads a ref that taking a hint also writes, so re-running this
  // would overwrite the cell just revealed with a replay from the
  // phrase start — every hint landing behind the snake, invisible.
  const hintsRestored = useRef(false);
  useEffect(() => {
    if (hintsRestored.current || hydratedHints <= 0) return;
    hintsRestored.current = true;
    const set = replayHints(
      puzzle.path.length,
      state.cells.length,
      hydratedHints,
    );
    hintedRef.current = set;
    setHintedSet(set);
  }, [hydratedHints, puzzle.path.length, state.cells.length]);

  // The readout shows given letters and hinted ones alike — both are
  // letters known but not yet placed. The GRID marks hinted cells only:
  // a given letter says what, never where.
  const revealed = useMemo(() => {
    const set = new Set(givenIndices);
    for (const idx of hintedSet) set.add(idx);
    return set;
  }, [givenIndices, hintedSet]);

  const hintCellKeys = useMemo(() => {
    if (hintedSet.size === 0) return undefined;
    const keys = new Set<string>();
    for (const idx of hintedSet) {
      keys.add(cellKey(puzzle.path[idx]));
    }
    return keys;
  }, [hintedSet, puzzle]);

  const canHint = useMemo(() => {
    for (let i = state.cells.length; i < puzzle.path.length; i++) {
      if (!hintedSet.has(i)) return true;
    }
    return false;
  }, [state.cells.length, puzzle.path.length, hintedSet]);

  // The coach sheet opens on demand only — the first-run introduction is
  // now the tutorial offer (see TutorialPrompt).
  const closeCoach = () => setCoachOpen(false);

  // Practice: offer a jump to the daily only while it's still unsolved.
  const [dailySolved, setDailySolved] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode.kind !== "practice") return;
    const today = localDateKey();
    void loadDailyProgress(mode.difficulty, today).then((saved) =>
      setDailySolved(saved?.solved ?? false),
    );
  }, [mode.kind, mode.difficulty]);

  // Show toast on solve.
  useEffect(() => {
    if (state.solved) show("Solved!", 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.solved]);

  const onTapCell = useCallback(
    (row: number, col: number) => dispatch({ type: "tapCell", row, col }),
    [dispatch],
  );

  return (
    <div
      data-level="serpentine"
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-6 md:max-w-2xl [@media(max-height:720px)]:pb-3"
    >
      {/* Header */}
      <header className="flex items-center justify-between pt-6 pb-2 [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-1">
        {mode.kind === "archive" ? (
          <Link
            to="/games/serpentine/archive"
            className="text-sm font-semibold text-ink-soft"
          >
            ← Archive
          </Link>
        ) : (
          <HomeLink />
        )}
        <span className="flex items-center gap-2">
          {mode.kind === "practice" && dailySolved === false && (
            <Link
              to="/games/serpentine"
              className="-my-3 inline-block py-3 text-sm font-semibold text-accent"
            >
              New daily puzzle
            </Link>
          )}
          {!state.solved && !isTutorial && (
            <button
              className="relative flex items-center gap-1 px-2.5 py-1 rounded-full
                         text-ink-soft text-xs font-semibold
                         active:scale-95 touch-manipulation select-none
                         after:absolute after:inset-x-0 after:-inset-y-2.5"
              disabled={!canHint}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                // The set is now player-driven; block any late restore.
                hintsRestored.current = true;
                const current = hintedRef.current;
                const idx = nextHintIndex(
                  puzzle.path.length,
                  state.cells.length,
                  current,
                );
                // After the early return, not before it: with every cell
                // already hinted there is nothing left to reveal, and a
                // tap that spends nothing is not a hint.
                if (idx === null) return;
                trackHint("serpentine");
                const next = new Set(current);
                next.add(idx);
                hintedRef.current = next;
                setHintedSet(next);
                setHints(next.size);
              }}
            >
              <Lightbulb aria-hidden className="h-3.5 w-3.5" />
              Hint{hintCount > 0 ? ` (${hintCount})` : ""}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              trackCoach("serpentine");
              setCoachOpen(true);
            }}
            aria-label="how to play"
            className="relative -m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90 after:absolute after:-inset-1"
          >
            <CircleHelp aria-hidden className="h-5 w-5" />
          </button>
        </span>
      </header>

      {/* Title + status */}
      {/* flex-wrap: at 320px with Huge text the mode label ("practice",
          "tutorial") does not fit beside the title, and an unwrapped row
          pushed it off the right edge. */}
      <div className="flex flex-wrap items-baseline gap-2.5 pb-3 [@media(max-height:720px)]:pb-1">
        <h1 className="text-2xl font-bold tracking-tight">Serpentine</h1>
        <svg role="img" aria-label="serpentine" width="20" height="20" viewBox="0 0 20 20"
          className="shrink-0 self-center text-accent">
          <path d="M5 3c0 2 5 3 5 5s-5 3-5 5 5 3 5 5" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        {mode.kind === "practice" ? (
          <span className="text-base font-semibold text-ink-soft">
            practice
          </span>
        ) : mode.kind === "tutorial" ? (
          <span className="text-base font-semibold text-ink-soft">
            tutorial
          </span>
        ) : mode.kind === "archive" ? (
          <span className="text-base font-semibold text-ink-soft">
            {formatDateKey(mode.dateKey)}
          </span>
        ) : null}
      </div>

      {isTutorial && (
        <TutorialBanner steps={TUTORIAL_STEPS} index={tutorialStep} />
      )}

      {/* Difficulty pills */}
      {difficulty !== undefined && onDifficultyChange && (
        <div className="flex gap-1 pb-3 [@media(max-height:720px)]:pb-1" role="group" aria-label="Difficulty">
          {(["haiku", "poem"] as Difficulty[]).map((d) => (
            <button
              key={d}
              aria-pressed={d === difficulty}
              className={[
                "relative px-4 py-1.5 rounded-full text-sm font-semibold",
                "touch-manipulation select-none transition-colors",
                "after:absolute after:inset-x-0 after:-inset-y-1.5",
                d === difficulty
                  ? "bg-accent text-surface"
                  : "bg-surface-tint text-ink-soft",
              ].join(" ")}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onDifficultyChange(d)}
            >
              {DIFF_LABELS[d]}
            </button>
          ))}
        </div>
      )}

      {storageBroken && !isTutorial && (
        <p className="pb-2 text-xs font-semibold text-warn" role="alert">
          Progress can't be saved on this device.
        </p>
      )}

      {/* Puzzle title + typed-out letters. The tutorial's phrase is not a
          poem, so it carries no credit. */}
      <div
        className={
          isTutorial
            ? "px-1 pt-4 pb-5 [@media(max-height:720px)]:pt-1 [@media(max-height:720px)]:pb-2"
            : // pt-10 is 50px of air at Huge text — the one block on this
              // screen that never tightened on a short viewport.
              "px-1 pt-10 pb-5 [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-2"
        }
      >
        {!isTutorial && (
          <PoemCredit
            puzzle={puzzle}
            className="pb-1 text-center text-sm font-medium text-accent"
            authorClass="text-xs text-ink-soft"
          />
        )}
        <SnakeText puzzle={puzzle} cells={state.cells} revealed={revealed} />
      </div>

      {/* Grid. min-h-0 so the board takes what is LEFT of the column
          rather than setting the column's height — see SnakeGrid, which
          measures this box. */}
      <div className="relative flex min-h-0 flex-1 flex-col py-2 [@media(max-height:720px)]:py-1">
        <SnakeGrid
          rows={puzzle.rows}
          cols={puzzle.cols}
          grid={puzzle.grid}
          cells={state.cells}
          claimed={state.claimed}
          solved={state.solved}
          blocked={puzzle.blocked}
          hintCells={hintCellKeys}
          onTapCell={onTapCell}
          onUndo={() => dispatch({ type: "undo" })}
          onClear={() => dispatch({ type: "clearSnake" })}
        />
        <GameToast toast={toast} />
      </div>

      <AnimatePresence mode="wait">
        {state.solved && showResults && isTutorial ? (
          <motion.div
            key="tutorial-done"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TutorialDone
              gameId="serpentine"
              recap={TUTORIAL_RECAP}
              onRestart={onRestartTutorial}
            />
          </motion.div>
        ) : state.solved && showResults ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 pb-2"
          >
            <p className="text-lg font-bold text-ink">Solved</p>
            {solvedElapsedMs !== null && (
              <p className="font-game text-2xl text-accent">
                {formatDuration(solvedElapsedMs)}
              </p>
            )}
            <p className="text-sm text-ink-soft">
              {puzzle.path.length} letters · {puzzle.rows}×{puzzle.cols} grid
            </p>
            {(mode.kind === "daily" || mode.kind === "archive") &&
              solvedElapsedMs !== null && (
              <ShareButton
                text={buildShareText(puzzle, mode.difficulty, mode.dateKey, solvedElapsedMs, hintCount)}
                gameId="serpentine"
              />
            )}
            {isDaily && (
              <DailyOutro gameId="serpentine" loadStreak={outroStreak} />
            )}
          </motion.div>
        ) : !state.solved ? (
          <motion.div
            key="controls"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3 [@media(max-height:720px)]:gap-1"
          >
            <div className="pb-3 [@media(max-height:720px)]:pb-1 text-center text-sm font-medium text-ink-soft">
              {state.cells.length} / {puzzle.path.length} letters
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => dispatch({ type: "undo" })}
                className="relative flex h-10 touch-manipulation items-center gap-1.5 rounded-lg bg-tile px-4 text-sm font-semibold text-ink after:absolute after:-inset-1.5 after:content-[''] active:scale-90"
              >
                <Undo2 aria-hidden className="h-4 w-4" />
                Undo
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => dispatch({ type: "clearSnake" })}
                className="relative flex h-10 touch-manipulation items-center gap-1.5 rounded-lg bg-tile px-4 text-sm font-semibold text-ink after:absolute after:-inset-1.5 after:content-[''] active:scale-90"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
                Clear
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showConfetti && <ConfettiOverlay />}

      {/* Coach */}
      <SerpentineCoach
        open={coachOpen}
        onClose={closeCoach}
        tutorialTo={isTutorial ? undefined : "/games/serpentine/tutorial"}
      />

      <TutorialPrompt
        enabled={isDaily}
        gameId="serpentine"
        gameName="Serpentine"
        loadSeen={loadTutorialSeen}
        markSeen={markTutorialSeen}
      />

      {/* Accessibility */}
      <div aria-live="polite" role="status" className="sr-only">
        {toast && <span key={toast.nonce}>{toast.text}</span>}
      </div>
    </div>
  );
}
