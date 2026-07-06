import "@fontsource/rubik-mono-one/latin-400.css";
import { use, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { formatDateKey, localDateKey } from "../../../lib/date";
import { HomeLink } from "../../../components/HomeLink";
import { loadDictionary } from "../../../lib/words/loader";
import { useCrosshatchGame, type GameMode } from "../state/useCrosshatchGame";
import {
  loadCoachSeen,
  loadDailyProgress,
  markCoachSeen,
} from "../state/persistence";
import { slotWord } from "../state/reducer";
import type { Slot } from "../engine/types";
import { cellKey, slotCells } from "../engine/types";
import { GridBoard } from "./GridBoard";
import { Keyboard } from "./Keyboard";
import { SlotChips } from "./SlotChips";
import { ProgressBar } from "./ProgressBar";
import { FoundCombosBar } from "./FoundCombosBar";
import { SolvedOverlay } from "./Overlays";

interface Props {
  mode: GameMode;
  onNewPuzzle?: () => void;
  /** Archive: wipe the day's progress and start a fresh run. */
  onReplay?: () => void;
}

export function GameScreen({ mode, onNewPuzzle, onReplay }: Props) {
  const { state, dispatch, puzzle, solvedElapsedMs } = useCrosshatchGame(mode);
  const dict = use(loadDictionary());
  const total = puzzle.combos.length;

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

  const [combosOpen, setCombosOpen] = useState(false);

  // Practice: offer a jump to the daily only while it's still unsolved.
  const [dailySolved, setDailySolved] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode.kind !== "practice") return;
    void loadDailyProgress(localDateKey()).then((saved) =>
      setDailySolved(saved?.solved ?? false),
    );
  }, [mode.kind]);

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
  // Space flips direction, Escape closes dialogs.
  const modalOpen = coachOpen || (state.solved && resultsOpen);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setCoachOpen(false);
        return;
      }
      if (modalOpen) return;
      if (e.key === "Enter") {
        dispatch({ type: "submit" });
      } else if (e.key === "Backspace") {
        dispatch({ type: "backspace" });
      } else if (e.key === " ") {
        e.preventDefault();
        if (state.cursor) {
          dispatch({
            type: "focusCell",
            row: state.cursor.row,
            col: state.cursor.col,
          });
        }
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        dispatch({ type: "typeLetter", letter: e.key });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, state.cursor, dispatch]);

  // Submit feedback: a transient toast over the board, narrated for
  // screen readers via the live region below.
  const [toast, setToast] = useState<{ text: string; nonce: number } | null>(
    null,
  );
  useEffect(() => {
    const r = state.lastResult;
    if (!r) return;
    const messages: Record<string, string> = {
      correct:
        state.found.length === total
          ? "Perfect sweep!"
          : `Combo ${state.found.length} of ${total}!`,
      duplicate: "Already found",
      incomplete: "Fill every cell",
      repeat: `${r.word?.toUpperCase()} is used twice`,
      noFit: r.word
        ? dict.has(r.word)
          ? `No combo uses ${r.word.toUpperCase()} there`
          : `${r.word.toUpperCase()} isn't in the word list`
        : "Not a combo",
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
        <FoundCombosBar
          state={state}
          open={combosOpen}
          onToggle={() => setCombosOpen((v) => !v)}
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
        <button
          type="button"
          onClick={() => dispatch({ type: "clearEntry" })}
          className="text-xs font-semibold text-ink-soft"
        >
          Clear grid
        </button>
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
          mode={mode.kind}
          dateKey={mode.kind === "practice" ? undefined : mode.dateKey}
          elapsedMs={solvedElapsedMs}
          open={resultsOpen}
          onClose={() => setResultsOpen(false)}
          onNewPuzzle={onNewPuzzle}
          onReplay={onReplay}
        />
      )}

      {coachOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface/80 px-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coach-title"
            className="w-full max-w-sm rounded-3xl border border-line bg-surface-raised p-6 shadow-xl"
          >
            <h2 id="coach-title" className="text-lg font-bold">
              How to play
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm text-ink-soft">
              <li>
                <span className="font-semibold text-ink">
                  Fill every line with a word
                </span>{" "}
                — together they're a combo. Dark cells are locked letters.
              </li>
              <li>
                Tap a cell to aim, tap it again to switch direction, and
                press <span className="font-semibold text-ink">Enter</span> to
                submit. Then change any line and find the{" "}
                <span className="font-semibold text-ink">next</span> combo.
              </li>
              <li>
                The chips under the grid count the unfound combos still
                using each word —{" "}
                <span className="font-semibold text-ink">0 means move on</span>
                . Reach 90% to solve the day.
              </li>
            </ul>
            <button
              type="button"
              autoFocus
              onClick={closeCoach}
              className="mt-5 w-full rounded-full bg-accent py-2.5 font-semibold text-surface active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Outcomes are otherwise visual-only; narrate them politely. */}
      <div aria-live="polite" role="status" className="sr-only">
        {toast?.text ?? ""}
      </div>
    </div>
  );
}
