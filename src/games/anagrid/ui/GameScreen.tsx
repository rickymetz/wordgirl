import "@fontsource/rubik-mono-one/latin-400.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  CircleHelp,
  Delete,
  Grid3x3,
  Lightbulb,
  MousePointerClick,
  Rows3,
  SpellCheck,
  TriangleAlert,
} from "lucide-react";
import { CoachSheet, Key } from "../../../components/CoachSheet";
import { ConfettiOverlay } from "../../../components/ConfettiOverlay";
import { DictionaryLink } from "../../../components/DictionaryLink";
import { HomeLink } from "../../../components/HomeLink";
import { ModalDialog } from "../../../components/ModalDialog";
import { ShareButton } from "../../../components/ShareButton";
import { TutorialPrompt } from "../../../components/TutorialPrompt";
import { DailyOutro } from "../../../components/game/DailyOutro";
import { GameToast, useToast } from "../../../components/game/GameToast";
import { TutorialBanner } from "../../../components/game/TutorialBanner";
import { TutorialDone } from "../../../components/game/TutorialDone";
import { trackCoach, trackHint } from "../../../lib/analytics";
import { formatDateKey, formatDuration, formatShareDate } from "../../../lib/date";
import { SHARE_URL } from "../../../lib/share";
import { useTutorialProgress } from "../../../lib/tutorial/useTutorialProgress";
import { useSolveTransition } from "../../../lib/useSolveTransition";
import { useStorageBroken } from "../../../lib/useStorageBroken";
import { clueFor } from "../engine/clues";
import { tutorialStepIndex } from "../engine/tutorial";
import { N } from "../engine/types";
import {
  displayStreak,
  loadStats,
  loadTutorialSeen,
  markTutorialSeen,
} from "../state/persistence";
import { BLANK, ERASER, conflictCells, peers as peersOf } from "../state/reducer";
import { useAnagridGame, type GameMode } from "../state/useAnagridGame";
import { Board, cluedCells, hiddenCells } from "./Board";
import { TUTORIAL_RECAP, TUTORIAL_STEPS } from "./tutorialSteps";

export const GAME_NAME = "Anagrid";

/** The streak `DailyOutro` shows — this game's own, read at the finish. */
const outroStreak = async (today: string) =>
  displayStreak(await loadStats(), today);

export function buildShareText(
  dateKey: string,
  elapsedMs: number,
  hints: number,
): string {
  const hintPart = hints > 0 ? `🫣 ${hints}` : "😎 0";
  return [
    `🔠 ${GAME_NAME} — ${formatShareDate(dateKey)}`,
    `⏱️ ${formatDuration(elapsedMs)} · ${hintPart}`,
    SHARE_URL,
  ].join("\n");
}

interface Props {
  mode: GameMode;
  /** Tutorial: replay the script from step one. */
  onRestartTutorial?: () => void;
  /** Archive: wipe the day's progress and start a fresh run. */
  onReplay?: () => Promise<void>;
}

export function GameScreen({ mode, onRestartTutorial, onReplay }: Props) {
  const { state, dispatch, puzzle, solvedElapsedMs, hydratedAsSolved, abandonSession } =
    useAnagridGame(mode);
  const isTutorial = mode.kind === "tutorial";
  const isDaily = mode.kind === "daily";
  const hasDate = mode.kind === "daily" || mode.kind === "archive";

  const storageBroken = useStorageBroken();
  const { showConfetti, showResults } = useSolveTransition(state.solved, hydratedAsSolved);
  const tutorialStep = useTutorialProgress(tutorialStepIndex(state));

  const [coachOpen, setCoachOpen] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);

  const conflicts = useMemo(
    () => conflictCells(puzzle.regions, state.entries),
    [puzzle.regions, state.entries],
  );
  const peers = useMemo(
    () =>
      state.selected === null
        ? new Set<number>()
        : peersOf(puzzle.regions, state.selected),
    [puzzle.regions, state.selected],
  );
  // Letter-first highlights the tool's letter; cell-first, the letter in
  // the selected cell — "where else is this letter?" either way.
  const focusLetter =
    state.mode === "letter" && state.tool !== null && state.tool !== ERASER
      ? state.tool
      : state.selected !== null && state.entries[state.selected] !== BLANK
        ? state.entries[state.selected]
        : null;

  const hiddenLabel = puzzle.col < 0 ? "Diagonal" : `Column ${puzzle.col + 1}`;
  const rowLabel = `Row ${puzzle.row + 1}`;
  const lineText = (cells: number[]) =>
    cells.map((c) => state.entries[c]).join("");

  // Physical keyboard: letters write, arrows move, Backspace erases.
  const modalOpen = coachOpen || replayOpen;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[role="dialog"]')) return;
      if (e.key === "Escape") {
        setCoachOpen(false);
        return;
      }
      if (modalOpen) return;
      const moves: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      if (moves[e.key]) {
        e.preventDefault();
        const [dRow, dCol] = moves[e.key];
        dispatch({ type: "move", dRow, dCol });
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (state.mode === "cell") dispatch({ type: "erase" });
      } else if (/^[a-zA-Z]$/.test(e.key) && state.mode === "cell") {
        dispatch({ type: "pressLetter", letter: e.key });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, dispatch, state.mode]);

  // Feedback over the board, narrated via the live region below.
  const { toast, show } = useToast();
  useEffect(() => {
    const f = state.feedback;
    if (!f) return;
    if (f.type === "full") {
      // Name the actual problem: repeats are visible in red; without
      // any, the only way to be wrong is a line that isn't the word.
      show(
        conflicts.size > 0
          ? "Every cell is full — some letters repeat"
          : "Every cell is full — but a word line isn't the word yet",
        3200,
      );
    }
    else if (f.type === "hint") show("Hint placed", 1400);
    else if (f.type === "solved") show("Solved!", 1600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.feedback]);

  const letters = [...puzzle.letters];
  const filledByPlayer = [...state.entries].filter(
    (ch, c) => ch !== BLANK && !puzzle.givens.includes(c),
  ).length;

  return (
    <div
      data-level="anagrid"
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-5 [@media(max-height:720px)]:pb-3"
    >
      <header className="flex items-center justify-between pt-5 pb-1 [@media(max-height:720px)]:pt-3">
        {mode.kind === "archive" ? (
          <Link to="/games/anagrid/archive" className="text-sm font-semibold text-ink-soft">
            ← Archive
          </Link>
        ) : (
          <HomeLink />
        )}
        <span className="flex items-center gap-2">
          {!state.solved && !isTutorial && (
            <button
              type="button"
              className="relative flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-soft touch-manipulation select-none active:scale-95 after:absolute after:inset-x-0 after:-inset-y-2.5"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                trackHint("anagrid");
                dispatch({ type: "revealHint" });
              }}
            >
              <Lightbulb aria-hidden className="h-3.5 w-3.5" />
              Hint{state.hints > 0 ? ` (${state.hints})` : ""}
            </button>
          )}
          {hasDate && <DictionaryLink gameId="anagrid" />}
          <button
            type="button"
            onClick={() => {
              trackCoach("anagrid");
              setCoachOpen(true);
            }}
            aria-label="how to play"
            className="relative -m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90 after:absolute after:-inset-1"
          >
            <CircleHelp aria-hidden className="h-5 w-5" />
          </button>
        </span>
      </header>

      {/* On a short screen the tutorial banner already says where you
          are; the title row is the height it needs at Huge text. */}
      <div
        className={`flex items-baseline gap-2.5 pb-2 ${
          isTutorial ? "[@media(max-height:720px)]:hidden" : ""
        }`}
      >
        <h1 className="font-game text-2xl font-normal tracking-tight">{GAME_NAME}</h1>
        {/* The mark: a clued row crossing a hidden column. */}
        <svg
          role="img"
          aria-label="anagrid"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          className="shrink-0 self-center text-accent"
        >
          <rect x="1" y="7" width="16" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <rect x="11" y="1" width="4" height="16" rx="1" fill="currentColor" opacity="0.35" />
        </svg>
        {mode.kind === "archive" && (
          <span className="text-base font-semibold text-ink-soft">{formatDateKey(mode.dateKey)}</span>
        )}
        {isTutorial && <span className="text-base font-semibold text-ink-soft">tutorial</span>}
      </div>

      {isTutorial && <TutorialBanner steps={TUTORIAL_STEPS} index={tutorialStep} />}

      {storageBroken && !isTutorial && (
        <p className="pb-2 text-xs font-semibold text-warn" role="alert">
          Progress can't be saved on this device.
        </p>
      )}

      {/* The clue, and both word lines as blanks that fill as you go. */}
      <div className="flex flex-col gap-1.5 rounded-2xl bg-surface-tint px-4 py-2.5">
        <p className="text-sm leading-snug">
          <span className="font-semibold text-accent">{rowLabel}:</span>{" "}
          {clueFor(puzzle.cluedWord)}
        </p>
        {/* The tutorial's steps point at the board's own shading and
            shading, and it needs the height at Huge text. */}
        {!isTutorial && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
            <LineBlanks
              label={rowLabel}
              text={lineText(cluedCells(puzzle))}
            />
            <LineBlanks
              label={hiddenLabel}
              text={lineText(hiddenCells(puzzle))}
            />
          </div>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col py-3 [@media(max-height:720px)]:py-2">
        <Board
          puzzle={puzzle}
          entries={state.entries}
          revealed={state.revealed}
          selected={state.selected}
          peers={peers}
          focusLetter={focusLetter}
          conflicts={conflicts}
          solved={state.solved}
          onTap={(cell) => dispatch({ type: "tapCell", cell })}
        />
        <GameToast toast={toast} />
      </div>

      <AnimatePresence mode="wait">
        {state.solved && showResults && isTutorial ? (
          <motion.div key="tutorial-done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <TutorialDone gameId="anagrid" recap={TUTORIAL_RECAP} onRestart={onRestartTutorial} />
          </motion.div>
        ) : state.solved && showResults ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 pb-1"
          >
            <p className="text-center text-sm text-ink-soft">
              <span className="font-semibold text-ink">{puzzle.cluedWord.toUpperCase()}</span> across ·{" "}
              <span className="font-semibold text-ink">{puzzle.hiddenWord.toUpperCase()}</span>{" "}
              {puzzle.col < 0 ? "on the diagonal" : "down"}
              {puzzle.family.length > 2 &&
                ` · also ${puzzle.family
                  .filter((w) => w !== puzzle.cluedWord && w !== puzzle.hiddenWord)
                  .map((w) => w.toUpperCase())
                  .join(" · ")}`}
            </p>
            {solvedElapsedMs !== null && (
              <p className="font-game text-2xl text-accent">{formatDuration(solvedElapsedMs)}</p>
            )}
            {state.hints > 0 && (
              <p className="text-xs text-ink-soft">
                {state.hints} {state.hints === 1 ? "hint" : "hints"}
              </p>
            )}
            {hasDate && solvedElapsedMs !== null && (
              <ShareButton
                text={buildShareText(mode.dateKey, solvedElapsedMs, state.hints)}
                gameId="anagrid"
              />
            )}
            {mode.kind === "archive" && onReplay && (
              <button
                type="button"
                onClick={() => setReplayOpen(true)}
                className="-my-3.5 touch-manipulation px-3 py-3.5 text-xs font-semibold text-ink-soft underline underline-offset-2"
              >
                Play again
              </button>
            )}
            {isDaily && <DailyOutro gameId="anagrid" loadStreak={outroStreak} />}
          </motion.div>
        ) : !state.solved ? (
          <motion.div
            key="controls"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2.5"
          >
            {/* The tutorial teaches cell-first only; the toggle is day chrome. */}
            {!isTutorial && (
            <div
              role="radiogroup"
              aria-label="Entry order"
              className="flex self-center rounded-full bg-tile p-1"
            >
              {(
                [
                  ["cell", "Cell first"],
                  ["letter", "Letter first"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={state.mode === value}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => dispatch({ type: "setMode", mode: value })}
                  className={`relative rounded-full px-4 py-1.5 text-xs font-semibold touch-manipulation after:absolute after:inset-x-0 after:-inset-y-2.5 ${
                    state.mode === value ? "bg-ink text-surface" : "text-ink-soft"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            )}
            <div className="flex gap-1.5">
              {letters.map((l) => {
                const active = state.mode === "letter" && state.tool === l;
                return (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={state.mode === "letter" ? active : undefined}
                    aria-label={`letter ${l.toUpperCase()}`}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => dispatch({ type: "pressLetter", letter: l })}
                    className={`flex h-12 min-w-0 flex-1 items-center justify-center rounded-lg font-game text-xl touch-manipulation select-none active:scale-95 ${
                      active ? "bg-accent text-surface" : "bg-tile text-ink"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                );
              })}
              <button
                type="button"
                aria-label="erase"
                aria-pressed={state.mode === "letter" ? state.tool === ERASER : undefined}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => dispatch({ type: "erase" })}
                className={`flex h-12 min-w-0 flex-1 items-center justify-center rounded-lg touch-manipulation select-none active:scale-95 ${
                  state.mode === "letter" && state.tool === ERASER
                    ? "bg-accent text-surface"
                    : "bg-tile text-ink"
                }`}
              >
                <Delete aria-hidden className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showConfetti && <ConfettiOverlay />}

      {replayOpen && (
        <ModalDialog labelledBy="replay-dialog-title" onClose={() => setReplayOpen(false)} className="text-center">
          <div>
            <h2 id="replay-dialog-title" className="text-lg font-bold">
              Play this day again?
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              The board clears and the clock restarts. Your first solve stays
              counted in your stats.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                data-autofocus
                onClick={() => {
                  setReplayOpen(false);
                  abandonSession();
                  void onReplay?.();
                }}
                className="rounded-full bg-accent py-2.5 font-semibold text-surface active:scale-95"
              >
                Play again
              </button>
              <button
                type="button"
                onClick={() => setReplayOpen(false)}
                className="rounded-full border border-line py-2.5 font-semibold active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      <AnimatePresence>
        {coachOpen && (
          <CoachSheet
            onClose={() => setCoachOpen(false)}
            tutorialTo={isTutorial ? undefined : "/games/anagrid/tutorial"}
            rules={[
              {
                Icon: Grid3x3,
                title: "One of each letter",
                body: (
                  <>
                    Every <Key>row</Key>, <Key>column</Key> and{" "}
                    <Key>box</Key> holds each of the six letters exactly once.
                  </>
                ),
              },
              {
                Icon: SpellCheck,
                title: "Two words",
                body: (
                  <>
                    The <Key>shaded row</Key> answers the clue. The other{" "}
                    <Key>shaded line</Key> spells another word from the same
                    letters — work it out yourself.
                  </>
                ),
              },
              {
                Icon: Rows3,
                title: "The words matter",
                body: (
                  <>
                    Sudoku logic alone always leaves a choice somewhere. The
                    two words settle it.
                  </>
                ),
              },
              {
                Icon: MousePointerClick,
                title: "Two ways to enter",
                body: (
                  <>
                    <Key>Cell first</Key>: tap a cell, then a letter.{" "}
                    <Key>Letter first</Key>: pick a letter, then tap every
                    cell it goes in.
                  </>
                ),
              },
              {
                Icon: TriangleAlert,
                title: "Repeats turn red",
                body: (
                  <>
                    A letter twice in a row, column or box shows in red.
                    Nothing else is checked until the board is full.
                  </>
                ),
              },
            ]}
          />
        )}
      </AnimatePresence>

      <TutorialPrompt
        enabled={isDaily}
        gameId="anagrid"
        gameName={GAME_NAME}
        loadSeen={loadTutorialSeen}
        markSeen={markTutorialSeen}
      />

      <div aria-live="polite" role="status" className="sr-only">
        {toast && <span key={toast.nonce}>{toast.text}</span>}
      </div>
      {!isTutorial && (
        <p className="sr-only">
          {filledByPlayer} of {N * N - puzzle.givens.length} letters placed.
        </p>
      )}
    </div>
  );
}

/** A word line as monospaced blanks: letters where filled, `?` where not. */
function LineBlanks({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-3 w-3 rounded-sm bg-accent/40"
      />
      <span>{label}</span>
      <span className="font-game text-ink" aria-label={`${label}: ${text.replaceAll(BLANK, " blank ")}`}>
        {[...text].map((ch, i) => (
          <span key={i} data-glyph>
            {ch === BLANK ? "?" : ch.toUpperCase()}
          </span>
        ))}
      </span>
    </span>
  );
}
