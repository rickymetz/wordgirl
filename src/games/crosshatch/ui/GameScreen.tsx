import "@fontsource/rubik-mono-one/latin-400.css";
import { use, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  CircleCheck,
  CircleHelp,
  CornerDownLeft,
  Layers,
  Lightbulb,
  ListChecks,
  Lock,
  Repeat2,
  Target,
  X,
} from "lucide-react";
import { formatDateKey, formatDuration, formatShareDate, localDateKey } from "../../../lib/date";
import { SHARE_URL } from "../../../lib/share";
import { ShareButton } from "../../../components/ShareButton";
import { DailyOutro } from "../../../components/game/DailyOutro";
import { HomeLink } from "../../../components/HomeLink";
import { trackCoach, trackHint } from "../../../lib/analytics";
import { GameToast } from "../../../components/game/GameToast";
import { ModalDialog } from "../../../components/ModalDialog";
import { CoachSheet, Key } from "../../../components/CoachSheet";
import { TutorialPrompt } from "../../../components/TutorialPrompt";
import { TutorialBanner, TUTORIAL_BANNER_H } from "../../../components/game/TutorialBanner";
import { TutorialDone } from "../../../components/game/TutorialDone";
import { useTutorialProgress } from "../../../lib/tutorial/useTutorialProgress";
import { tutorialStepIndex } from "../engine/tutorial";
import { TUTORIAL_RECAP, TUTORIAL_STEPS } from "./tutorialSteps";
import { ConfettiOverlay } from "../../../components/ConfettiOverlay";
import { useSolveTransition } from "../../../lib/useSolveTransition";
import { useStorageBroken } from "../../../lib/useStorageBroken";
import { loadDictionary } from "../../../lib/words/loader";
import { useCrosshatchGame, type GameMode } from "../state/useCrosshatchGame";
import {
  displayStreak,
  isDaySolved,
  loadDailyProgress,
  loadStats,
  loadTutorialSeen,
  markTutorialSeen,
} from "../state/persistence";

import {
  hintLetterIndex,
  hintTarget,
  letterAt,
  slotsAt,
  slotWord,
  unfoundWords,
} from "../state/reducer";
import type { Level, Slot } from "../engine/types";
import { cellKey, LEVEL_LABEL, LEVELS, slotCells } from "../engine/types";
import { GridBoard } from "./GridBoard";
import { Keyboard } from "./Keyboard";
import { SlotChips } from "./SlotChips";
import { ProgressBar } from "./ProgressBar";
import { WordsPanel } from "./WordsPanel";

/** The streak `DailyOutro` shows — this game's own, read at the finish. */
const outroStreak = async (today: string) =>
  displayStreak(await loadStats(), today);

function buildShareText(
  found: number,
  total: number,
  hints: number,
  dateKey: string,
  elapsedMs: number,
  level: Level,
): string {
  const date = formatShareDate(dateKey);
  const hintPart = hints > 0 ? ` · 🫣 ${hints}` : " · 🤓 0";
  return [
    `🧺 Crosshatch — ${date}`,
    `${LEVEL_LABEL[level]} · ${found}/${total} words · ⏱️ ${formatDuration(elapsedMs)}${hintPart}`,
    SHARE_URL,
  ].join("\n");
}

/** Height the board budget gives up to the pill row, px at default text
 * size: a 24px pill plus its air, less the 6px the title row gives back
 * by closing up above it. The grid's CHROME_H was measured without the
 * row, so without this it would come out of the page rather than out of
 * the board. */
const LEVEL_PILLS_H = 26;

interface Props {
  mode: GameMode;
  /** Daily/archive: the board on screen and how to switch boards. Absent
   * on dates that carry only the normal board. */
  level?: Level;
  onLevelChange?: (level: Level) => void;
  onNewPuzzle?: () => void;
  /** Tutorial: replay the script from step one. */
  onRestartTutorial?: () => void;
  /** Archive: wipe the day's progress and start a fresh run. */
  onReplay?: () => void;
}

export function GameScreen({
  mode,
  level,
  onLevelChange,
  onRestartTutorial,
}: Props) {
  const {
    state,
    dispatch,
    puzzle,
    totalWords: total,
    solvedElapsedMs,
    hydratedAsSolved,
  } = useCrosshatchGame(mode);
  const dict = use(loadDictionary());
  const isTutorial = mode.kind === "tutorial";
  const isDaily = mode.kind === "daily";

  const storageBroken = useStorageBroken();
  const { showConfetti, showResults } = useSolveTransition(state.solved, hydratedAsSolved);

  // The tutorial's running instruction. Only ever moves forward.
  const tutorialStep = useTutorialProgress(tutorialStepIndex(state));

  // The coach sheet opens on demand only — the first-run introduction is
  // now the tutorial offer (see TutorialPrompt).
  const [coachOpen, setCoachOpen] = useState(false);
  const closeCoach = () => setCoachOpen(false);

  const [wordsOpen, setWordsOpen] = useState(false);

  // Practice: offer a jump to the daily only while it's still unsolved.
  // "Unsolved" means the DAY — a player who has finished the normal
  // board but not the hard one still has today's puzzle to play.
  const [dailySolved, setDailySolved] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode.kind !== "practice") return;
    void isDaySolved(localDateKey()).then(setDailySolved);
  }, [mode.kind]);

  // The date's OTHER board, so a finished board can hand the player on
  // to the one still standing between them and the day.
  const [otherBoardSolved, setOtherBoardSolved] = useState<boolean | null>(
    null,
  );
  const otherLevel: Level | null =
    level === undefined ? null : level === "normal" ? "hard" : "normal";
  // The date on screen — NOT localDateKey(). They agree on the daily
  // only until midnight passes with the app open, and an archive play
  // is some other date entirely.
  const boardDateKey =
    mode.kind === "daily" || mode.kind === "archive" ? mode.dateKey : null;
  useEffect(() => {
    // Archive dates carry two boards too, and a finished board there
    // needs the same tick and the same way over.
    if (boardDateKey === null || otherLevel === null) return;
    void loadDailyProgress(boardDateKey, otherLevel).then((saved) =>
      setOtherBoardSolved(saved?.solved ?? false),
    );
    // Re-checked when this board solves: the player may have done the
    // other one first, in which case the day is finished here.
  }, [boardDateKey, otherLevel, state.solved]);

  // Daily hints are free to use but marked: the first one warns that
  // the day's result will carry a hint count.
  const [hintWarningOpen, setHintWarningOpen] = useState(false);
  const hintUsed = Object.keys(state.revealed).length > 0;
  // Tapping an unfound word in the list aims the next hint at it.
  const [hintTargetWord, setHintTargetWord] = useState<string | null>(null);
  useEffect(() => {
    if (hintTargetWord && state.found.includes(hintTargetWord)) {
      setHintTargetWord(null);
    }
  }, [hintTargetWord, state.found]);
  // Reveal the next still-hidden letter of the (chosen or default)
  // word — leftmost first, so hints build a prefix.
  const revealNextLetter = () => {
    const chosen =
      hintTargetWord &&
      unfoundWords(state).includes(hintTargetWord) &&
      (state.revealed[hintTargetWord] ?? []).length < hintTargetWord.length
        ? hintTargetWord
        : undefined;
    const target = chosen ?? hintTarget(state);
    if (!target) return;
    const letterIndex = hintLetterIndex(state, target);
    if (letterIndex === null) return;
    // Counted HERE, where a letter is actually spent — not on the button.
    // Two things go wrong on the button: the first hint of a day opens a
    // confirmation, so declining still counted one, and the words panel
    // has its own Hint that reaches this by another route and counted
    // nothing. Both entry points pass through here, and only when a
    // letter is really revealed.
    trackHint("crosshatch");
    dispatch({ type: "revealHint", word: target, letterIndex });
  };
  const requestHint = () => {
    if ((mode.kind === "daily" || mode.kind === "archive") && !hintUsed) {
      setHintWarningOpen(true);
    } else {
      revealNextLetter();
    }
  };
  const confirmHint = () => {
    setHintWarningOpen(false);
    revealNextLetter();
  };

  const focusSlot = (slot: Slot) => {
    setWordsOpen(false);
    // Aim at the slot's first editable cell, in the slot's direction.
    const target =
      slotCells(slot).find(
        (c) => !puzzle.givens[cellKey(c.row, c.col)],
      ) ?? slotCells(slot)[0];
    dispatch({
      type: "focusCell",
      row: target.row,
      col: target.col,
      dir: slot.dir,
    });
  };

  // Physical keyboard: letters type, Backspace deletes, Enter submits,
  // Space flips direction, arrows move the cursor, Escape closes
  // dialogs. Enter/Space defer to a FOCUSED control (a keyboard user
  // tabbing the page keeps native button activation), and dialogs own
  // their keys entirely.
  const modalOpen = hintWarningOpen || coachOpen;
  useEffect(() => {
    const moveCursor = (dr: number, dc: number) => {
      const cur = state.cursor;
      if (!cur) return;
      let { row, col } = cur;
      while (true) {
        row += dr;
        col += dc;
        if (row < 0 || col < 0 || row >= puzzle.rows || col >= puzzle.cols) {
          return; // no playable cell that way
        }
        if (slotsAt(puzzle, row, col).length > 0) {
          setWordsOpen(false);
          dispatch({
            type: "focusCell",
            row,
            col,
            dir: dr !== 0 ? "down" : "across",
          });
          return;
        }
      }
    };
    const ARROWS: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[role="dialog"]')) {
        if (e.key === "Escape") {
          setCoachOpen(false);
          setHintWarningOpen(false);
        }
        return;
      }
      if (e.key === "Escape") {
        setCoachOpen(false);
        setHintWarningOpen(false);
        return;
      }
      if (modalOpen) return;
      const onControl = !!target?.closest(
        "button, a, input, select, textarea",
      );
      if (e.key === "Enter") {
        if (onControl) return; // native activation wins
        e.preventDefault();
        setWordsOpen(false);
        dispatch({ type: "submit" });
      } else if (e.key === "Backspace") {
        setWordsOpen(false);
        dispatch({ type: "backspace" });
      } else if (e.key === " ") {
        if (onControl) return;
        e.preventDefault();
        if (state.cursor) {
          dispatch({
            type: "focusCell",
            row: state.cursor.row,
            col: state.cursor.col,
          });
        }
      } else if (ARROWS[e.key]) {
        e.preventDefault();
        moveCursor(...ARROWS[e.key]);
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        setWordsOpen(false);
        dispatch({ type: "typeLetter", letter: e.key });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, state.cursor, puzzle, dispatch]);

  // Play-by-play for screen readers: typed letters, cursor moves, and
  // hint reveals are otherwise visual-only.
  const [playAnnounce, setPlayAnnounce] = useState("");
  const prevPlayRef = useRef({
    grid: state.grid,
    cursor: state.cursor,
    revealed: state.revealed,
  });
  useEffect(() => {
    const prev = prevPlayRef.current;
    prevPlayRef.current = {
      grid: state.grid,
      cursor: state.cursor,
      revealed: state.revealed,
    };
    if (state.revealed !== prev.revealed) {
      for (const [word, positions] of Object.entries(state.revealed)) {
        const before = prev.revealed[word] ?? [];
        const fresh = positions.find((p) => !before.includes(p));
        if (fresh !== undefined) {
          setPlayAnnounce(
            `Hint: letter ${fresh + 1} of a ${word.length}-letter word is ${word[fresh].toUpperCase()}.`,
          );
          return;
        }
      }
    }
    if (state.grid !== prev.grid) {
      const keys = new Set([
        ...Object.keys(state.grid),
        ...Object.keys(prev.grid),
      ]);
      for (const k of keys) {
        if (state.grid[k] && state.grid[k] !== prev.grid[k]) {
          setPlayAnnounce(state.grid[k].toUpperCase());
          return;
        }
      }
      const removed = Object.keys(prev.grid).filter((k) => !state.grid[k]);
      if (removed.length > 1) setPlayAnnounce("Grid cleared.");
      else if (removed.length === 1)
        setPlayAnnounce(`Deleted ${prev.grid[removed[0]].toUpperCase()}.`);
      return;
    }
    if (state.cursor && state.cursor !== prev.cursor) {
      const l = letterAt(state, state.cursor.row, state.cursor.col);
      setPlayAnnounce(
        `Row ${state.cursor.row + 1}, column ${state.cursor.col + 1} — ${
          l ? l.toUpperCase() : "empty"
        }, ${state.cursor.dir}.`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.grid, state.cursor, state.revealed]);

  // Submit feedback: a transient toast over the board, narrated for
  // screen readers via the live region below.
  const [toast, setToast] = useState<{ text: string; nonce: number } | null>(
    null,
  );
  useEffect(() => {
    const r = state.lastResult;
    if (!r) return;
    const banked = (r.newWords ?? []).map((w) => w.toUpperCase());
    const messages: Record<string, string> = {
      correct:
        state.found.length === total
          ? "Perfect sweep!"
          : banked.length === 1
            ? `${banked[0]} — ${state.found.length} of ${total}`
            : `${banked.length} new words — ${state.found.length} of ${total}`,
      // Kept short enough to stay on ONE line: these are the longest
      // strings any game emits, and the pill is now capped to the
      // viewport, so wordier phrasing wraps to two lines on a phone.
      // They double as the screen-reader narration, so each still names
      // what actually failed.
      nothingNew: "No new words — change a line",
      incomplete: "Fill every cell",
      repeat: `${r.word?.toUpperCase()} is used twice`,
      // The two ways a line can be wrong, said apart — the second is
      // the one players hit holding a word they KNOW is real. It is:
      // the generator enumerates answers from the `required` tier, but
      // dict.has() also accepts `bonus`, so a real-but-rarer word is
      // rejected here. Naming the crossings for that would be a lie —
      // the word simply isn't one of this puzzle's answers.
      noFit: r.word
        ? !dict.has(r.word)
          ? `${r.word.toUpperCase()} isn't in the word list`
          : `${r.word.toUpperCase()} isn't an answer here`
        : "Not a valid grid",
    };
    setToast({ text: messages[r.type] ?? "", nonce: r.nonce });
    // Misses linger longer — this is the game's main teaching moment.
    const timer = setTimeout(
      () => setToast(null),
      r.type === "correct" ? 1600 : 3000,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastResult]);

  const hintCount = Object.values(state.revealed).reduce(
    (n, p) => n + p.length,
    0,
  );

  return (
    <div
      data-level="crosshatch"
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-6 md:max-w-2xl [@media(max-height:720px)]:pb-3"
    >
      <header className="flex items-center justify-between pt-6 pb-2 [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-1">
        {mode.kind === "archive" ? (
          <Link
            to="/games/crosshatch/archive"
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
              to="/games/crosshatch"
              className="text-sm font-semibold text-accent"
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
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setWordsOpen(true);
                requestHint();
              }}
            >
              <Lightbulb aria-hidden className="h-3.5 w-3.5" />
              Hint{hintCount > 0 ? ` (${hintCount})` : ""}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              trackCoach("crosshatch");
              setCoachOpen(true);
            }}
            aria-label="how to play"
            className="relative -m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90 after:absolute after:-inset-1"
          >
            <CircleHelp aria-hidden className="h-5 w-5" />
          </button>
        </span>
      </header>

      {/* The pill row belongs to the title, so it closes up under it —
          which also buys back the height the row costs. */}
      <div
        className={`flex items-baseline gap-2.5 ${
          level !== undefined && onLevelChange ? "pb-1.5" : "pb-3"
        }`}
      >
        <h1 className="font-game text-2xl font-normal tracking-tight">Crosshatch</h1>
        {/* The game's mark: a little hatch. */}
        <svg
          role="img"
          aria-label="crosshatch"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          className="shrink-0 self-center text-accent"
        >
          <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="7" y1="2.5" x2="7" y2="17.5" />
            <line x1="13" y1="2.5" x2="13" y2="17.5" />
            <line x1="2.5" y1="7" x2="17.5" y2="7" />
            <line x1="2.5" y1="13" x2="17.5" y2="13" />
          </g>
        </svg>
        {mode.kind === "archive" && (
          <span className="text-base font-semibold text-ink-soft">
            {formatDateKey(mode.dateKey)}
          </span>
        )}
        {mode.kind === "practice" && (
          <span className="text-base font-semibold text-ink-soft">
            practice
          </span>
        )}
        {isTutorial && (
          <span className="text-base font-semibold text-ink-soft">
            tutorial
          </span>
        )}
      </div>

      {/* Board pills, on their own line under the title — the same place
          Serpentine puts haiku/poem. The row is kept tight (and folded
          into the grid's height budget below) because at the Huge text
          setting the grid is already down on its 34px touch floor and
          can give nothing back to pay for it. */}
      {level !== undefined && onLevelChange && (
        <div
          className="flex gap-1 pb-2 [@media(max-height:720px)]:pb-1"
          role="group"
          aria-label="Board"
        >
          {LEVELS.map((l) => {
            const solved =
              l === level ? state.solved : (otherBoardSolved ?? false);
            return (
              <button
                key={l}
                aria-pressed={l === level}
                className={[
                  "relative rounded-full px-3.5 py-1 text-sm font-semibold",
                  "touch-manipulation select-none transition-colors",
                  // Small pills, so the 44px touch target comes from an
                  // invisible expansion rather than padding.
                  "after:absolute after:-inset-x-1 after:-inset-y-2.5",
                  l === level
                    ? "bg-accent text-surface"
                    : "bg-surface-tint text-ink-soft",
                ].join(" ")}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => onLevelChange(l)}
              >
                {LEVEL_LABEL[l]}
                {solved ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      )}

      {isTutorial && (
        <TutorialBanner steps={TUTORIAL_STEPS} index={tutorialStep} />
      )}

      {storageBroken && !isTutorial && (
        <p className="pb-2 text-xs font-semibold text-warn" role="alert">
          Progress can't be saved on this device.
        </p>
      )}

      {/* The progress bar stays — "2/5" is what the last step asks you to
          watch. The words panel does not: it is a browse-the-day list whose
          job is aiming hints, and hints are off on the tutorial. Dropping
          it also keeps the grid and keyboard on-screen at large text. */}
      <ProgressBar found={state.found.length} total={total} />

      {!isTutorial && (
        <div className="pt-3">
          <WordsPanel
            state={state}
            open={wordsOpen}
            onToggle={() => setWordsOpen((v) => !v)}
            onHint={requestHint}
            hintTargetWord={hintTargetWord}
            onSelectWord={(w) =>
              setHintTargetWord((cur) => (cur === w ? null : w))
            }
          />
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 [@media(max-height:720px)]:gap-2 [@media(max-height:720px)]:py-2">
        <div className="relative">
          {/* Any puzzle input closes an open words panel — the player
              has moved on from browsing to playing. */}
          <GridBoard
            state={state}
            reservedH={
              (isTutorial ? TUTORIAL_BANNER_H : 0) +
              (level !== undefined && onLevelChange ? LEVEL_PILLS_H : 0)
            }
            onFocus={(row, col) => {
              setWordsOpen(false);
              dispatch({ type: "focusCell", row, col });
            }}
          />
          {/* Transient submit feedback, floating above the board.
              mode="wait" so rapid submits never stack two pills.
              Anchored by its BOTTOM, not a negative top: this game's
              misses are its longest messages, and a wrapped second line
              has to grow up into the gap rather than down over the
              grid's top row. */}
          <GameToast toast={toast} className="bottom-full mb-1" />
        </div>

        <SlotChips state={state} onFocusSlot={focusSlot} />
      </div>

      <AnimatePresence mode="wait">
        {state.solved && showResults && isTutorial ? (
          <motion.div
            key="tutorial-done"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TutorialDone
              gameId="crosshatch"
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
            <p className="text-lg font-bold text-ink">
              {level !== undefined ? `${LEVEL_LABEL[level]} solved` : "Solved"}
            </p>
            {solvedElapsedMs !== null && (
              <p className="font-game text-2xl text-accent">
                {formatDuration(solvedElapsedMs)}
              </p>
            )}
            <p className="text-sm text-ink-soft">
              {state.found.length}/{total} words
              {hintCount > 0 ? ` · ${hintCount} hints` : ""}
            </p>
            {/* One board down, one to go: the day only counts when both
                are solved, so say so and offer the way over. */}
            {otherLevel !== null &&
              onLevelChange &&
              otherBoardSolved === false && (
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => onLevelChange(otherLevel)}
                  className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-surface active:scale-95"
                >
                  Play the {LEVEL_LABEL[otherLevel]} board
                </button>
              )}
            {(mode.kind === "daily" || mode.kind === "archive") &&
              mode.dateKey &&
              solvedElapsedMs !== null && (
              <ShareButton
                text={buildShareText(
                  state.found.length,
                  total,
                  hintCount,
                  mode.dateKey,
                  solvedElapsedMs,
                  puzzle.level,
                )}
                gameId="crosshatch"
              />
            )}
            {/* The streak belongs to the DAY, and the day needs both
                boards — showing it after the first would report a streak
                the player hasn't earned yet. */}
            {isDaily && (otherLevel === null || otherBoardSolved) && (
              <DailyOutro gameId="crosshatch" loadStreak={outroStreak} />
            )}
          </motion.div>
        ) : !state.solved ? (
          <motion.div
            key="controls"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-6">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  setWordsOpen(false);
                  dispatch({ type: "clearEntry" });
                }}
                className="-my-3 px-3 py-3 text-xs font-semibold text-ink-soft"
              >
                Clear grid
              </button>
            </div>
            <Keyboard
              onLetter={(letter) => {
                setWordsOpen(false);
                dispatch({ type: "typeLetter", letter });
              }}
              onBackspace={() => {
                setWordsOpen(false);
                dispatch({ type: "backspace" });
              }}
              onEnter={() => {
                setWordsOpen(false);
                dispatch({ type: "submit" });
              }}
              submitReady={puzzle.shape.slots.every(
                (slot) => slotWord(state, slot).complete,
              )}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showConfetti && <ConfettiOverlay />}

      {hintWarningOpen && (
        <ModalDialog
          labelledBy="hint-dialog-title"
          onClose={() => setHintWarningOpen(false)}
          className="text-center"
        >
          <div>
            <h2 id="hint-dialog-title" className="text-lg font-bold">
              Use a hint?
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              The next hidden letter of an unfound word will be revealed
              in your word list, and today's result will note{" "}
              <span className="font-semibold text-ink">
                how many hints you used
              </span>
              . Streaks are safe — hints never break them.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                data-autofocus
                onClick={confirmHint}
                className="rounded-full bg-accent py-2.5 font-semibold text-surface active:scale-95"
              >
                Use hint
              </button>
              <button
                type="button"
                onClick={() => setHintWarningOpen(false)}
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
            onClose={closeCoach}
            tutorialTo={isTutorial ? undefined : "/games/crosshatch/tutorial"}
            rules={[
              {
                Icon: Lock,
                title: "Fill every line",
                body: (
                  <>
                    Type a <Key>real word</Key> into every line — typing
                    fills only the <Key>empty cells</Key> (the padlocked
                    letters are fixed). Tap any cell to move there; re-tap
                    a crossing to switch direction.
                  </>
                ),
              },
              {
                Icon: CornerDownLeft,
                title: "Submit the grid",
                body: (
                  <>
                    Press <Key>Enter</Key> once every cell is filled — each{" "}
                    <Key>new word</Key> in a working grid counts.
                  </>
                ),
              },
              {
                Icon: ListChecks,
                title: "Chips",
                body: (
                  <>
                    They judge each line:{" "}
                    <X
                      aria-label="X"
                      className="inline h-3.5 w-3.5 text-warn"
                      strokeWidth={3}
                    />{" "}
                    won't work there,{" "}
                    <Check
                      aria-label="check"
                      className="inline h-3.5 w-3.5"
                      strokeWidth={3}
                    />{" "}
                    counted already,{" "}
                    <CircleCheck
                      aria-label="circled check"
                      className="inline h-3.5 w-3.5 text-good"
                      strokeWidth={3}
                    />{" "}
                    a new word. Tap a chip to jump to its line.
                  </>
                ),
              },
              {
                Icon: Repeat2,
                title: "Resubmit",
                body: (
                  <>
                    Change a line and submit again — <Key>reusing</Key>{" "}
                    counted words is allowed, and usually needed to reach
                    the rest.
                  </>
                ),
              },
              {
                Icon: Target,
                title: "Solve the board",
                body: (
                  <>
                    Find <Key>every word</Key> to solve the board.{" "}
                    <Key>Your words</Key> lists them as ?-blanks — tap one,
                    then Hint, to reveal its next letter.
                  </>
                ),
              },
              // Only worth saying where there IS a second board: on a
              // pre-HARD_EPOCH archive date the day is one board, and
              // promising two would be a lie.
              ...(level !== undefined
                ? [
                    {
                      Icon: Layers,
                      title: "Two boards",
                      body: (
                        <>
                          Each day has a <Key>Normal</Key> board and a{" "}
                          <Key>Hard</Key> board — same puzzle idea, longer
                          lines and fewer letters given. Solve{" "}
                          <Key>both</Key> to finish the day.
                        </>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        )}
      </AnimatePresence>

      <TutorialPrompt
        enabled={isDaily}
        gameId="crosshatch"
        gameName="Crosshatch"
        loadSeen={loadTutorialSeen}
        markSeen={markTutorialSeen}
      />

      {/* Outcomes are otherwise visual-only; narrate them politely.
          Keyed by nonce so an identical repeated outcome still mutates
          the DOM — screen readers only announce on change. */}
      <div aria-live="polite" role="status" className="sr-only">
        {toast && <span key={toast.nonce}>{toast.text}</span>}
      </div>
      <div aria-live="polite" className="sr-only">
        {playAnnounce}
      </div>
    </div>
  );
}
