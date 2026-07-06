import "@fontsource/rubik-mono-one/latin-400.css";
import { use, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { formatDateKey, localDateKey } from "../../../lib/date";
import { HomeLink } from "../../../components/HomeLink";
import { ModalDialog } from "../../../components/ModalDialog";
import { loadDictionary } from "../../../lib/words/loader";
import { useCrosshatchGame, type GameMode } from "../state/useCrosshatchGame";
import {
  loadCoachSeen,
  loadDailyProgress,
  markCoachSeen,
} from "../state/persistence";
import { hintTarget, slotsAt, slotWord, unfoundWords } from "../state/reducer";
import type { Slot } from "../engine/types";
import { cellKey, slotCells } from "../engine/types";
import { GridBoard } from "./GridBoard";
import { Keyboard } from "./Keyboard";
import { SlotChips } from "./SlotChips";
import { ProgressBar } from "./ProgressBar";
import { WordsPanel } from "./WordsPanel";
import { SolvedOverlay } from "./Overlays";

interface Props {
  mode: GameMode;
  onNewPuzzle?: () => void;
  /** Archive: wipe the day's progress and start a fresh run. */
  onReplay?: () => void;
}

export function GameScreen({ mode, onNewPuzzle, onReplay }: Props) {
  const { state, dispatch, puzzle, totalWords: total, solvedElapsedMs } =
    useCrosshatchGame(mode);
  const dict = use(loadDictionary());

  // Warn (once) if this device can't persist progress.
  const [storageBroken, setStorageBroken] = useState(false);
  useEffect(() => {
    const onError = () => setStorageBroken(true);
    window.addEventListener("wg:storage-error", onError);
    return () => window.removeEventListener("wg:storage-error", onError);
  }, []);

  // The solve card is dismissable — and reopens for a perfect sweep.
  const [resultsOpen, setResultsOpen] = useState(true);
  useEffect(() => {
    if (state.found.length === total && total > 0) setResultsOpen(true);
  }, [state.found.length, total]);

  // One-time first-run coach, reopenable from the header "?".
  const [coachOpen, setCoachOpen] = useState(false);
  useEffect(() => {
    void loadCoachSeen().then((seen) => {
      if (!seen) setCoachOpen(true);
    });
  }, []);
  const closeCoach = () => {
    setCoachOpen(false);
    void markCoachSeen();
  };

  const [wordsOpen, setWordsOpen] = useState(false);

  // Practice: offer a jump to the daily only while it's still unsolved.
  const [dailySolved, setDailySolved] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode.kind !== "practice") return;
    void loadDailyProgress(localDateKey()).then((saved) =>
      setDailySolved(saved?.solved ?? false),
    );
  }, [mode.kind]);

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
  // Reveal a RANDOM still-hidden letter of the (chosen or default) word.
  const revealRandomLetter = () => {
    const chosen =
      hintTargetWord &&
      unfoundWords(state).includes(hintTargetWord) &&
      (state.revealed[hintTargetWord] ?? []).length < hintTargetWord.length
        ? hintTargetWord
        : undefined;
    const target = chosen ?? hintTarget(state);
    if (!target) return;
    const already = state.revealed[target] ?? [];
    const unrevealed = [...target]
      .map((_, i) => i)
      .filter((i) => !already.includes(i));
    // Don't burn a hint on a letter the board already shows: skip
    // positions that are a GIVEN in every line this word can occupy.
    const slotIdxs = puzzle.shape.slots
      .map((_, si) => si)
      .filter((si) => puzzle.combos.some((c) => c[si] === target));
    const fresh = unrevealed.filter(
      (i) =>
        !(
          slotIdxs.length > 0 &&
          slotIdxs.every((si) => {
            const c = slotCells(puzzle.shape.slots[si])[i];
            return !!puzzle.givens[cellKey(c.row, c.col)];
          })
        ),
    );
    const candidates = fresh.length > 0 ? fresh : unrevealed;
    if (candidates.length === 0) return;
    dispatch({
      type: "revealHint",
      word: target,
      letterIndex: candidates[Math.floor(Math.random() * candidates.length)],
    });
  };
  const requestHint = () => {
    if (mode.kind !== "practice" && !hintUsed) {
      setHintWarningOpen(true);
    } else {
      revealRandomLetter();
    }
  };
  const confirmHint = () => {
    setHintWarningOpen(false);
    revealRandomLetter();
  };

  const focusSlot = (slot: Slot) => {
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
  const modalOpen =
    hintWarningOpen || coachOpen || (state.solved && resultsOpen);
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
        dispatch({ type: "submit" });
      } else if (e.key === "Backspace") {
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
        dispatch({ type: "typeLetter", letter: e.key });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, state.cursor, puzzle, dispatch]);

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
      nothingNew: "You\u2019ve already found all these words — change a line",
      incomplete: "Fill every cell",
      repeat: `${r.word?.toUpperCase()} is used twice`,
      // Three honest flavors of rejection: gibberish, a real word
      // that's too rare for the day's common-words list, and a common
      // word whose crossings can't be completed.
      noFit: r.word
        ? !dict.has(r.word)
          ? `${r.word.toUpperCase()} isn't in the word list`
          : !dict.required.buckets.get(r.word.length)?.includes(r.word)
            ? `${r.word.toUpperCase()} is too rare for today's list`
            : `${r.word.toUpperCase()} doesn't work with the crossing lines`
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

  return (
    <div
      data-level={10}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-6 [@media(max-height:720px)]:pb-3"
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
        <span className="flex items-center gap-3">
          {mode.kind === "practice" && dailySolved === false && (
            <Link
              to="/games/crosshatch"
              className="text-sm font-semibold text-accent"
            >
              New daily puzzle
            </Link>
          )}
          {state.solved && !resultsOpen && (
            <button
              type="button"
              onClick={() => setResultsOpen(true)}
              className="text-sm font-semibold text-accent"
            >
              Results
            </button>
          )}
          <button
            type="button"
            onClick={() => setCoachOpen(true)}
            aria-label="how to play"
            className="-m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-base font-bold text-ink-soft active:scale-90"
          >
            ?
          </button>
        </span>
      </header>

      <div className="flex items-baseline gap-2.5 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Crosshatch</h1>
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
      </div>

      {storageBroken && (
        <p className="pb-2 text-xs font-semibold text-warn" role="alert">
          Progress can't be saved on this device.
        </p>
      )}

      <ProgressBar found={state.found.length} total={total} />

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

      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 [@media(max-height:720px)]:gap-2 [@media(max-height:720px)]:py-2">
        <div className="relative">
          <GridBoard
            state={state}
            onFocus={(row, col) => dispatch({ type: "focusCell", row, col })}
          />
          {/* Transient submit feedback, floating above the board.
              mode="wait" so rapid submits never stack two pills. */}
          <AnimatePresence mode="wait">
            {toast && toast.text && (
              <motion.div
                key={toast.nonce}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-sm font-bold whitespace-nowrap text-surface"
              >
                {toast.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <SlotChips state={state} onFocusSlot={focusSlot} />
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => dispatch({ type: "clearEntry" })}
            className="-my-2 px-2 py-2 text-xs font-semibold text-ink-soft"
          >
            Clear grid
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              // The button says Hint, so it hints — opening the words
              // panel too shows where the reveal landed.
              setWordsOpen(true);
              requestHint();
            }}
            className="-my-2 px-2 py-2 text-xs font-semibold text-accent"
          >
            Hint
          </button>
        </div>
        <Keyboard
          onLetter={(letter) => dispatch({ type: "typeLetter", letter })}
          onBackspace={() => dispatch({ type: "backspace" })}
          onEnter={() => dispatch({ type: "submit" })}
          submitReady={puzzle.shape.slots.every(
            (slot) => slotWord(state, slot).complete,
          )}
        />
      </div>

      {state.solved && (
        <SolvedOverlay
          found={state.found.length}
          total={total}
          hints={Object.values(state.revealed).reduce(
            (n, p) => n + p.length,
            0,
          )}
          mode={mode.kind}
          dateKey={mode.kind === "practice" ? undefined : mode.dateKey}
          elapsedMs={solvedElapsedMs}
          open={resultsOpen}
          onClose={() => setResultsOpen(false)}
          onNewPuzzle={onNewPuzzle}
          onReplay={onReplay}
        />
      )}

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
              A letter of an unfound word will be revealed in your word
              list, and today's result will show a{" "}
              <span className="font-semibold text-ink">🫣 hint count</span>.
              Streaks are safe — hints never break them.
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

      {coachOpen && (
        <ModalDialog labelledBy="coach-title" onClose={closeCoach}>
          <div>
            <h2 id="coach-title" className="text-lg font-bold">
              How to play
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm text-ink-soft">
              <li>
                <span className="font-semibold text-ink">
                  Fill every line with a word
                </span>{" "}
                (dark cells are locked) and press{" "}
                <span className="font-semibold text-ink">Enter</span> — every
                new word in the grid counts. Change any line and keep going.
              </li>
              <li>
                The chips under the grid judge each line: ❌ won't work
                there, ⚠️ counted already, ✅ new — but the{" "}
                <span className="font-semibold text-ink">whole grid</span>{" "}
                must be filled to submit.
              </li>
              <li>
                The bar up top lists every word as{" "}
                <span className="font-semibold text-ink">?-blanks</span>;
                stuck, tap Hint to reveal a letter. Find most of the words
                to solve the day.
              </li>
            </ul>
            <button
              type="button"
              data-autofocus
              onClick={closeCoach}
              className="mt-5 w-full rounded-full bg-accent py-2.5 font-semibold text-surface active:scale-95"
            >
              Got it
            </button>
          </div>
        </ModalDialog>
      )}

      {/* Outcomes are otherwise visual-only; narrate them politely. */}
      <div aria-live="polite" role="status" className="sr-only">
        {toast?.text ?? ""}
      </div>
    </div>
  );
}
