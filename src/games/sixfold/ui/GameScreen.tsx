import "@fontsource/rubik-mono-one/latin-400.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  CircleHelp,
  Delete,
  Grid3x3,
  Lightbulb,
  Puzzle,
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
import { tutorialStepIndex } from "../engine/tutorial";
import { N } from "../engine/types";
import {
  displayStreak,
  loadStats,
  loadTutorialSeen,
  markTutorialSeen,
} from "../state/persistence";
import {
  BLANK,
  conflictCells,
  isLocked,
  peers as peersOf,
  wrongLines,
  type Feedback,
} from "../state/reducer";
import { useSixfoldGame, type GameMode } from "../state/useSixfoldGame";
import { cluedCells, hiddenCells } from "../engine/hints";
import { Board } from "./Board";
import { TUTORIAL_RECAP, TUTORIAL_STEPS } from "./tutorialSteps";

export const GAME_NAME = "Sixfold";

/** The streak `DailyOutro` shows — this game's own, read at the finish. */
const outroStreak = async (today: string) =>
  displayStreak(await loadStats(), today);

export function buildShareText(
  dateKey: string,
  elapsedMs: number,
  hints: number,
  day: { cryptic: boolean; diagonal: boolean },
): string {
  const hintPart = hints > 0 ? `🫣 ${hints}` : "😎 0";
  // Like the siblings, line two says what kind of board it was: the
  // day's clue, and the diagonal when the hidden word ran along it.
  const kind = `${day.cryptic ? "Cryptic" : "Straight"} clue${day.diagonal ? " · diagonal" : ""}`;
  return [
    `🔠 ${GAME_NAME} — ${formatShareDate(dateKey)}`,
    `${kind} · ⏱️ ${formatDuration(elapsedMs)} · ${hintPart}`,
    SHARE_URL,
  ].join("\n");
}

interface Props {
  mode: GameMode;
  /** Tutorial: replay the script from step one. */
  onRestartTutorial?: () => void;
  /** Archive: wipe the day's progress and start a fresh run. */
  onReplay?: () => Promise<void>;
  /** Practice: deal a fresh board. */
  onNewPuzzle?: () => void;
}

/** Human position for narration and toasts: "row 2, column 4". */
const where = (cell: number) => `row ${Math.floor(cell / N) + 1}, column ${(cell % N) + 1}`;

export function GameScreen({ mode, onRestartTutorial, onReplay, onNewPuzzle }: Props) {
  const { state, dispatch, puzzle, solvedElapsedMs, hydratedAsSolved, abandonSession } =
    useSixfoldGame(mode);
  const isTutorial = mode.kind === "tutorial";
  const isDaily = mode.kind === "daily";
  const hasDate = mode.kind === "daily" || mode.kind === "archive";

  const storageBroken = useStorageBroken();
  const { showConfetti, showResults } = useSolveTransition(state.solved, hydratedAsSolved);
  const tutorialStep = useTutorialProgress(tutorialStepIndex(state));

  const rootRef = useRef<HTMLDivElement>(null);
  // Last input was a key (vs a pointer): only then does a hint pull focus
  // back to the grid — on touch it would just draw a focus ring.
  const keyboardRef = useRef(false);
  useEffect(() => {
    const onKey = () => (keyboardRef.current = true);
    const onPointer = () => (keyboardRef.current = false);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, []);
  const resultsRef = useRef<HTMLDivElement>(null);
  // A solve made here moves focus to the results, so a screen reader hears
  // the words and time and a keyboard lands on Share. (A day that loads
  // already solved leaves focus alone.)
  useEffect(() => {
    if (showResults && state.solved && !hydratedAsSolved) resultsRef.current?.focus({ preventScroll: true });
  }, [showResults, state.solved, hydratedAsSolved]);
  const [coachOpen, setCoachOpen] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);
  const [hintAskOpen, setHintAskOpen] = useState(false);

  // Only the PLAYER's letters carry the repeat mark: a given is never the
  // mistake, even when it is one half of the clash.
  const repeats = useMemo(() => {
    const all = conflictCells(puzzle.regions, state.entries);
    return new Set([...all].filter((c) => !isLocked(state, c)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.regions, state.entries, state.revealed]);
  const badLines = useMemo(() => wrongLines(puzzle, state.entries), [puzzle, state.entries]);
  const wrongCells = useMemo(
    () =>
      new Set(
        badLines.flatMap((l) => (l === "clued" ? cluedCells(puzzle) : hiddenCells(puzzle))),
      ),
    [badLines, puzzle],
  );
  const peers = useMemo(
    () => (state.selected === null ? new Set<number>() : peersOf(puzzle.regions, state.selected)),
    [puzzle.regions, state.selected],
  );
  const focusLetter =
    state.selected !== null && state.entries[state.selected] !== BLANK
      ? state.entries[state.selected]
      : null;

  // One name per line, everywhere: the clue card, its readout, toasts.
  const rowLabel = `Row ${puzzle.row + 1}`;
  const hiddenLabel = puzzle.col < 0 ? "Diagonal" : `Column ${puzzle.col + 1}`;
  const lineText = (cells: number[]) => cells.map((c) => state.entries[c]).join("");
  // Which of a line's letters the player typed (indigo on the board, so
  // indigo in the readout too); givens and hints stay ink.
  const typedIn = (cells: number[]) =>
    cells.map((c) => state.entries[c] !== BLANK && !isLocked(state, c));
  const lineLabel = (l: "clued" | "hidden") =>
    l === "clued" ? rowLabel : puzzle.col < 0 ? "The diagonal" : hiddenLabel;

  const takeHint = () => {
    trackHint("sixfold");
    dispatch({ type: "revealHint" });
  };
  // The first hint of the day asks: a stray tap would otherwise cost the
  // hint-free day (and the roundup's grand confetti) with no way back.
  // The confirm is about the day's record; practice keeps none.
  const askHint = () =>
    state.hints === 0 && mode.kind !== "practice" ? setHintAskOpen(true) : takeHint();

  // Physical keyboard. The grid handles its own arrows (focus moves with
  // them); letters and Backspace work from anywhere except another
  // control, which keeps its own keys.
  const modalOpen = coachOpen || replayOpen || hintAskOpen;
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
      const onGrid = !!target?.closest('[role="grid"]');
      if (!onGrid && target?.closest("button, a, input, select, textarea")) return;
      if (!onGrid && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d: Record<string, [number, number]> = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -1],
          ArrowRight: [0, 1],
        };
        const [dRow, dCol] = d[e.key] ?? [0, 0];
        dispatch({ type: "move", dRow, dCol });
      } else if (e.key === "Backspace" || e.key === "Delete") {
        dispatch({ type: "erase" });
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        dispatch({ type: "pressLetter", letter: e.key });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, dispatch]);

  // Feedback: the toast shows what needs eyes; the live region narrates
  // every write, since a tap on a letter key never moves focus.
  const { toast, show } = useToast();
  const [narration, setNarration] = useState("");
  useEffect(() => {
    const f: Feedback | null = state.feedback;
    if (!f) return;
    switch (f.type) {
      case "placed":
        setNarration(
          `${f.letter.toUpperCase()}, ${where(f.cell)}${f.repeats ? " — repeats" : ""}.`,
        );
        break;
      case "cleared":
        setNarration(`Cleared ${where(f.cell)}.`);
        break;
      case "hint":
        // The toast region already announces it: narrating too said it twice.
        show(`Hint: ${state.entries[f.cell].toUpperCase()} at ${where(f.cell)}`, 1600);
        // Back to the board: the hint dialog hands focus to the Hint
        // button, where letters and arrows do nothing.
        if (keyboardRef.current) {
          requestAnimationFrame(() =>
            rootRef.current?.querySelector<HTMLElement>(`[data-cell="${f.cell}"]`)?.focus({ preventScroll: true }),
          );
        }
        break;
      case "locked":
        show("Given letters can't change", 1600);
        break;
      case "noCell":
        show("Tap a cell first", 1600);
        break;
      case "full": {
        const bad = wrongLines(puzzle, state.entries);
        if (bad.length === 2) {
          show(`${rowLabel} and ${lineLabel("hidden").toLowerCase()} aren't the words`, 4000);
        } else if (bad.length) {
          const l = bad[0];
          const cells = l === "clued" ? cluedCells(puzzle) : hiddenCells(puzzle);
          show(`${lineLabel(l)} spells ${lineText(cells).toUpperCase()} — not the word`, 4000);
        } else {
          show("Every cell is full — some letters repeat", 3200);
        }
        break;
      }
      case "solved":
        show("Solved!", 1600);
        setNarration(
          `Solved. ${puzzle.cluedWord.toUpperCase()} across, ${puzzle.hiddenWord.toUpperCase()} ${
            puzzle.col < 0 ? "on the diagonal" : "down"
          }.`,
        );
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.feedback]);

  const letters = [...puzzle.letters];
  const filledByPlayer = [...state.entries].filter(
    (ch, c) => ch !== BLANK && !puzzle.givens.includes(c),
  ).length;

  return (
    <div
      ref={rootRef}
      data-level="sixfold"
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-5 [@media(max-height:720px)]:pb-3"
    >
      <header className="flex items-center justify-between pt-6 pb-2 [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-1">
        {mode.kind === "archive" ? (
          <Link to="/games/sixfold/archive" className="text-sm font-semibold text-ink-soft">
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
              onClick={askHint}
            >
              <Lightbulb aria-hidden className="h-3.5 w-3.5" />
              Hint{state.hints > 0 ? ` (${state.hints})` : ""}
            </button>
          )}
          {hasDate && <DictionaryLink gameId="sixfold" />}
          <button
            type="button"
            onClick={() => {
              trackCoach("sixfold");
              setCoachOpen(true);
            }}
            aria-label="how to play"
            className="relative -m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90 after:absolute after:-inset-1"
          >
            <CircleHelp aria-hidden className="h-5 w-5" />
          </button>
        </span>
      </header>

      {/* The title row gives way first on a short screen: the tutorial
          banner already says where you are, and on the smallest phones a
          cryptic clue wraps to three lines, which at Huge text left the
          board on its touch floor and the page scrolling. */}
      <div
        className={`flex items-baseline gap-2.5 pb-3 [@media(max-height:720px)]:pb-2 ${
          isTutorial ? "[@media(max-height:720px)]:hidden" : "[@media(max-height:600px)]:sr-only"
        }`}
      >
        <h1 className="font-game text-2xl font-normal tracking-tight">{GAME_NAME}</h1>
        {/* The mark: a die's six — six pips in the board's 2×3 box shape. */}
        <svg
          role="img"
          aria-label="sixfold"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          className="shrink-0 self-center text-accent"
        >
          <rect x="2" y="2" width="16" height="16" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <g fill="currentColor">
            <circle cx="7" cy="6.25" r="1.6" />
            <circle cx="13" cy="6.25" r="1.6" />
            <circle cx="7" cy="10" r="1.6" />
            <circle cx="13" cy="10" r="1.6" />
            <circle cx="7" cy="13.75" r="1.6" />
            <circle cx="13" cy="13.75" r="1.6" />
          </g>
        </svg>
        {mode.kind === "archive" && (
          <span className="text-base font-semibold text-ink-soft">{formatDateKey(mode.dateKey)}</span>
        )}
        {mode.kind === "practice" && <span className="text-base font-semibold text-ink-soft">practice</span>}
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
        <p className="text-base leading-snug [@media(max-height:640px)]:text-sm">
          <span className="font-semibold text-accent">{rowLabel}:</span> {puzzle.clue}
          {puzzle.clueCryptic && (
            // A cryptic reads as nonsense to anyone expecting a definition;
            // saying so up front is the difference between a puzzle and a bug.
            <span className="ml-1.5 inline-block rounded-full border border-accent/60 px-1.5 text-[0.7rem] font-semibold tracking-wide text-accent uppercase">
              Cryptic
            </span>
          )}
        </p>
        {/* The tutorial's steps point at the board's own shading, and it
            needs the height at Huge text. */}
        {/* Once solved, the results line under the board names both words. */}
        {!isTutorial && !state.solved && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
            <LineBlanks label={rowLabel} text={lineText(cluedCells(puzzle))} typed={typedIn(cluedCells(puzzle))} wrong={badLines.includes("clued")} />
            <LineBlanks label={hiddenLabel} text={lineText(hiddenCells(puzzle))} typed={typedIn(hiddenCells(puzzle))} wrong={badLines.includes("hidden")} />
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
          repeats={repeats}
          wrong={wrongCells}
          solved={state.solved}
          onTap={(cell) => dispatch({ type: "tapCell", cell })}
          onFocusCell={(cell) => dispatch({ type: "select", cell })}
          onMove={(dRow, dCol) => dispatch({ type: "move", dRow, dCol })}
        />
        <GameToast
          toast={toast}
          className="top-0 [@media(max-height:640px)]:top-auto [@media(max-height:640px)]:bottom-full"
        />
      </div>

      <AnimatePresence mode="wait">
        {state.solved && showResults && isTutorial ? (
          <motion.div key="tutorial-done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <TutorialDone gameId="sixfold" recap={TUTORIAL_RECAP} onRestart={onRestartTutorial} />
          </motion.div>
        ) : state.solved && showResults ? (
          <motion.div
            key="results"
            ref={resultsRef}
            tabIndex={-1}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 pb-1 outline-none"
          >
            <p className="text-center text-sm text-ink-soft">
              <span className="font-semibold text-ink">{puzzle.cluedWord.toUpperCase()}</span> across ·{" "}
              <span className="font-semibold text-ink">{puzzle.hiddenWord.toUpperCase()}</span>{" "}
              {puzzle.col < 0 ? "on the diagonal" : "down"}
            </p>
            {puzzle.family.length > 2 && (
              <p className="text-center text-xs text-ink-soft">
                Other words from these letters:{" "}
                <span className="font-semibold text-ink">
                  {puzzle.family
                    .filter((w) => w !== puzzle.cluedWord && w !== puzzle.hiddenWord)
                    .map((w) => w.toUpperCase())
                    .join(" · ")}
                </span>
              </p>
            )}
            {puzzle.clueCryptic && puzzle.clueHow && (
              <p className="text-center text-xs text-ink-soft">
                The cryptic: <span className="font-semibold text-ink">{puzzle.clueHow}</span>
              </p>
            )}
            {(solvedElapsedMs !== null || state.hints > 0) && (
              <p className="flex items-baseline gap-2">
                {solvedElapsedMs !== null && (
                  <span className="font-game text-2xl text-accent">{formatDuration(solvedElapsedMs)}</span>
                )}
                {state.hints > 0 && (
                  <span className="text-xs text-ink-soft">
                    {state.hints} {state.hints === 1 ? "hint" : "hints"}
                  </span>
                )}
              </p>
            )}
            {hasDate && solvedElapsedMs !== null && (
              <ShareButton
                text={buildShareText(mode.dateKey, solvedElapsedMs, state.hints, {
                  cryptic: puzzle.clueCryptic === true,
                  diagonal: puzzle.col < 0,
                })}
                gameId="sixfold"
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
            {mode.kind === "practice" && onNewPuzzle && (
              <button
                type="button"
                onClick={onNewPuzzle}
                className="mt-1 rounded-full bg-accent px-6 py-2.5 font-semibold text-surface active:scale-95"
              >
                New board
              </button>
            )}
            {isDaily && <DailyOutro gameId="sixfold" loadStreak={outroStreak} />}
          </motion.div>
        ) : !state.solved ? (
          <motion.div key="controls" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {/* Seven keys a row: the pad borrows 6px of the page gutter
                each side so every key clears 44px from a 375px screen. */}
            <div className="-mx-1.5 flex gap-1">
              {letters.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-label={`letter ${l.toUpperCase()}`}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => dispatch({ type: "pressLetter", letter: l })}
                  className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-lg bg-tile font-game text-xl text-ink touch-manipulation select-none active:scale-95"
                >
                  {l.toUpperCase()}
                </button>
              ))}
              <button
                type="button"
                aria-label="erase"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => dispatch({ type: "erase" })}
                className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-lg bg-tile text-ink touch-manipulation select-none active:scale-95"
              >
                <Delete aria-hidden className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showConfetti && <ConfettiOverlay />}

      {hintAskOpen && (
        <ModalDialog labelledBy="hint-dialog-title" onClose={() => setHintAskOpen(false)} className="text-center">
          <div>
            <h2 id="hint-dialog-title" className="text-lg font-bold">
              Use a hint?
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              The next cell you could work out gets filled in, and today's
              result will note{" "}
              <span className="font-semibold text-ink">how many hints you used</span>.
              Streaks are safe — hints never break them.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                data-autofocus
                onClick={() => {
                  setHintAskOpen(false);
                  takeHint();
                }}
                className="rounded-full bg-accent py-2.5 font-semibold text-surface active:scale-95"
              >
                Use hint
              </button>
              <button
                type="button"
                onClick={() => setHintAskOpen(false)}
                className="rounded-full border border-line py-2.5 font-semibold active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

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
            tutorialTo={isTutorial ? undefined : "/games/sixfold/tutorial"}
            rules={[
              {
                Icon: Grid3x3,
                title: "One of each letter",
                body: (
                  <>
                    Every <Key>row</Key>, <Key>column</Key> and <Key>box</Key>{" "}
                    holds each of the six letters exactly once. Tap a cell,
                    then a letter.
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
                    Sudoku logic carries you most of the way, then stalls.
                    The two words settle it.
                  </>
                ),
              },
              {
                Icon: TriangleAlert,
                title: "Repeats are flagged",
                body: (
                  <>
                    A letter twice in a row, column or box gets a{" "}
                    <Key>corner mark</Key>. If a full board still isn't
                    right, the line that isn't its word is named.
                  </>
                ),
              },
              {
                Icon: Puzzle,
                title: "Cryptic clues",
                body: (
                  <>
                    Some days the clue is <Key>cryptic</Key>: one end defines
                    the word, the rest builds it from parts. How it works is
                    shown when you finish.
                  </>
                ),
              },
              {
                Icon: Lightbulb,
                title: "Hints",
                body: (
                  <>
                    A hint fills in the next cell you could work out. Your
                    result notes how many you used.
                  </>
                ),
              },
            ]}
          />
        )}
      </AnimatePresence>

      <TutorialPrompt
        enabled={isDaily}
        gameId="sixfold"
        gameName={GAME_NAME}
        loadSeen={loadTutorialSeen}
        markSeen={markTutorialSeen}
      />

      <div aria-live="polite" role="status" className="sr-only">
        {toast && <span key={toast.nonce}>{toast.text}</span>}
      </div>
      <div aria-live="polite" className="sr-only">
        {narration}
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
  typed,
  wrong = false,
}: {
  label: string;
  text: string;
  /** Per letter: typed by the player (accent), as on the board. */
  typed: readonly boolean[];
  wrong?: boolean;
}) {
  // aria-label is ignored on a plain span, so the spoken version is real
  // (visually hidden) text beside the glyphs.
  const spoken = `${label}: ${[...text].map((ch) => (ch === BLANK ? "blank" : ch.toUpperCase())).join(", ")}${
    wrong ? ". Not the word" : ""
  }.`;
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden>{label}</span>
      <span className="font-game text-ink" aria-hidden>
        {[...text].map((ch, i) => (
          <span key={i} data-glyph className={typed[i] ? "text-accent" : undefined}>
            {ch === BLANK ? "?" : ch.toUpperCase()}
          </span>
        ))}
      </span>
      {wrong && (
        <span className="flex items-center gap-0.5 font-semibold text-warn" aria-hidden>
          <TriangleAlert className="h-3.5 w-3.5" />
          not the word
        </span>
      )}
      <span className="sr-only">{spoken}</span>
    </span>
  );
}
