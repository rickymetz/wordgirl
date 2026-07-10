import "@fontsource/rubik-mono-one/latin-400.css";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import {
  CircleHelp,
  CornerDownLeft,
  Delete,
  FlipHorizontal2,
  Hourglass,
  Sparkles,
  Type,
} from "lucide-react";
import { formatDateKey, localDateKey } from "../../../lib/date";
import { HomeLink } from "../../../components/HomeLink";
import { CoachSheet, Key } from "../../../components/CoachSheet";
import { useBackwordsGame, type GameMode } from "../state/useBackwordsGame";
import {
  loadCoachSeen,
  loadDailyProgress,
  markCoachSeen,
} from "../state/persistence";
import { glyphRowCount } from "../state/reducer";
import { MirrorBoard } from "./MirrorBoard";
import { LetterBank } from "./LetterBank";
import { dragPoint } from "./dragPoint";
import { SolvedOverlay } from "./Overlays";

interface Props {
  mode: GameMode;
  onNewPuzzle?: () => void;
  /** Archive: wipe the day's progress and start a fresh run. */
  onReplay?: () => void;
}

export function GameScreen({ mode, onNewPuzzle, onReplay }: Props) {
  const { state, dispatch, puzzle, solvedElapsedMs, abandonSession } =
    useBackwordsGame(mode);
  // Replay wipes the save; kill this mount's persistence first so the
  // unmount flush can't write the old progress back over the reset.
  const replay = onReplay
    ? () => {
        abandonSession();
        onReplay();
      }
    : undefined;

  // Warn (once) if this device can't persist progress.
  const [storageBroken, setStorageBroken] = useState(false);
  useEffect(() => {
    const onError = () => setStorageBroken(true);
    window.addEventListener("wg:storage-error", onError);
    return () => window.removeEventListener("wg:storage-error", onError);
  }, []);

  // Results card is dismissable — closing reveals the solved board.
  const [resultsOpen, setResultsOpen] = useState(true);

  // A tile in flight: the mirror reflects it LIVE — the ghost tracks
  // the drag, mirrored across the glass, so it works from EITHER side
  // of the line. Positioned by writing straight to the DOM: a setState
  // per drag frame re-renders the board mid-drag, and motion's drag
  // measurements drift under it (the tile runs away from the finger
  // on iOS).
  const onDragLive = useCallback(
    (
      letter: string | null,
      e?: MouseEvent | TouchEvent | PointerEvent,
      info?: PanInfo,
    ) => {
      const ghost = document.getElementById("bw-drag-ghost");
      if (!ghost) return;
      const point = letter ? dragPoint(e, info) : null;
      if (!letter || !point) {
        ghost.style.display = "none";
        return;
      }
      const mirror = document.getElementById("bw-mirror");
      if (!mirror) return;
      const r = mirror.getBoundingClientRect();
      ghost.style.display = "flex";
      ghost.style.left = `${r.width - (point.x - r.left)}px`;
      ghost.style.top = `${point.y - r.top}px`;
      ghost.textContent = letter;
    },
    [],
  );

  // The staged letters already read as an odd palindrome's half: the
  // middle tile slides onto the glass BEFORE commit, so the straddle
  // is a live preview rather than a surprise.
  const currentDef = state.lexicon.get(state.current);
  const currentStraddle =
    !!currentDef &&
    currentDef.kind === "palindrome" &&
    currentDef.words[0].length % 2 === 1;

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

  // Practice: offer a jump to the daily only while it's still unsolved.
  const [dailySolved, setDailySolved] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode.kind !== "practice") return;
    void loadDailyProgress(localDateKey()).then((saved) =>
      setDailySolved(saved?.solved ?? false),
    );
  }, [mode.kind]);

  // Physical keyboard: letters stage, Backspace deletes, Enter places.
  const modalOpen = coachOpen || (state.solved && resultsOpen);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[role="dialog"]')) {
        if (e.key === "Escape") setCoachOpen(false);
        return;
      }
      if (e.key === "Escape") {
        setCoachOpen(false);
        return;
      }
      if (modalOpen) return;
      const onControl = !!target?.closest(
        "button, a, input, select, textarea",
      );
      if (e.key === "Enter") {
        if (onControl) return; // native activation wins
        e.preventDefault();
        dispatch({ type: "commit" });
      } else if (e.key === "Backspace") {
        dispatch({ type: "backspace" });
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        dispatch({ type: "typeLetter", letter: e.key });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, dispatch]);

  // Submit feedback: a transient toast over the board, narrated for
  // screen readers via the live region below.
  const [toast, setToast] = useState<{ text: string; nonce: number } | null>(
    null,
  );
  useEffect(() => {
    const r = state.lastResult;
    if (!r) return;
    const messages: Record<string, string> = {
      committed:
        r.type === "committed"
          ? r.row.words.map((w) => w.toUpperCase()).join(" · ")
          : "",
      solved: "Board clear!",
      invalid:
        r.type === "invalid"
          ? `${r.place.toUpperCase()} doesn't read both ways`
          : "",
      duplicate: "Already placed",
      empty: "Tap letters to build a row",
    };
    setToast({ text: messages[r.type] ?? "", nonce: r.nonce });
    const timer = setTimeout(
      () => setToast(null),
      r.type === "invalid" ? 3000 : 1600,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastResult]);

  return (
    <div
      data-level="backwords"
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-6 [@media(max-height:720px)]:pb-3"
    >
      <header className="flex items-center justify-between pt-6 pb-2 [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-1">
        {mode.kind === "archive" ? (
          <Link
            to="/games/backwords/archive"
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
              to="/games/backwords"
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
            className="-m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90"
          >
            <CircleHelp aria-hidden className="h-5 w-5" />
          </button>
        </span>
      </header>

      <div className="flex items-baseline gap-2.5 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Backwords</h1>
        {/* The game's mark: a letter meeting its reflection. */}
        <svg
          role="img"
          aria-label="backwords"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          className="shrink-0 self-center text-accent"
        >
          <g fill="currentColor">
            <rect x="9.25" y="2.5" width="1.5" height="15" rx="0.75" />
            <path d="M6.5 5.5v9L2 10z" />
            <path d="M13.5 5.5v9L18 10z" />
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

      <div className="text-sm font-medium text-ink-soft">
        {state.solved
          ? "Every letter placed"
          : `${state.bank.length} letters left`}
      </div>

      {/* id: the drop target for dragged bank tiles. */}
      <div
        id="bw-board"
        className="relative flex flex-1 flex-col justify-center py-4 [@media(max-height:720px)]:py-2"
      >
        <MirrorBoard
          rows={state.rows}
          current={state.current}
          currentStraddle={currentStraddle}
          solved={state.solved}
          bankAll={puzzle.bank}
          onBreakRow={(index) => dispatch({ type: "breakRow", index })}
          onUnstage={(index) => dispatch({ type: "unstage", index })}
          onDragLive={onDragLive}
        />
        <AnimatePresence mode="wait">
          {toast && toast.text && (
            <motion.div
              key={toast.nonce}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-sm font-bold whitespace-nowrap text-surface"
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!state.solved && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => dispatch({ type: "clearRow" })}
              className="-my-3 px-3 py-3 text-xs font-semibold text-ink-soft"
            >
              Clear row
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => dispatch({ type: "backspace" })}
              aria-label="delete letter"
              className="relative flex h-9 w-11 items-center justify-center rounded-lg bg-tile text-ink after:absolute after:-inset-1.5 after:content-[''] active:scale-90"
            >
              <Delete aria-hidden className="h-4 w-4" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => dispatch({ type: "commit" })}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition-colors active:scale-95 ${
                state.current.length > 0
                  ? "bg-accent text-surface"
                  : "bg-tile text-ink-soft"
              }`}
            >
              Place
            </button>
          </div>
          <LetterBank
            all={puzzle.bank}
            remaining={state.bank}
            onLetter={(letter) => dispatch({ type: "typeLetter", letter })}
            onDragLive={onDragLive}
          />
        </div>
      )}

      {state.solved && (
        <SolvedOverlay
          words={state.rows.length}
          glyphs={glyphRowCount(state.rows)}
          mode={mode.kind}
          dateKey={mode.kind === "practice" ? undefined : mode.dateKey}
          elapsedMs={solvedElapsedMs}
          open={resultsOpen}
          onClose={() => setResultsOpen(false)}
          onNewPuzzle={onNewPuzzle}
          onReplay={replay}
        />
      )}

      <AnimatePresence>
        {coachOpen && (
          <CoachSheet
            onClose={closeCoach}
            rules={[
              {
                Icon: Type,
                title: "Build rows",
                body: (
                  <>
                    Tap or drag letters to lay a word against the mirror.
                    Its reflection reads it <Key>backwards</Key> — and that
                    reading must be a <Key>real word</Key> too.
                  </>
                ),
              },
              {
                Icon: FlipHorizontal2,
                title: "Palindromes",
                body: (
                  <>
                    A word that reads the same both ways needs its{" "}
                    <Key>first half plus the middle letter</Key> — the
                    middle tile slides onto the glass and the mirror
                    completes the rest.
                  </>
                ),
              },
              {
                Icon: CornerDownLeft,
                title: "Place and rework",
                body: (
                  <>
                    <Key>Place</Key> (or Enter) sets the row. Tap a placed
                    row's × to take its letters back — nothing is locked
                    until the board is done.
                  </>
                ),
              },
              {
                Icon: Hourglass,
                title: "Use every letter",
                body: (
                  <>
                    The board is solved when the rack is <Key>empty</Key>.
                    The clock runs silently and your <Key>time</Key> is
                    revealed at the end — fewer long words or many short
                    ones both win.
                  </>
                ),
              },
              {
                Icon: Sparkles,
                title: "True mirror rows",
                body: (
                  <>
                    Some rows survive a real mirror — LIT reflects as TIL.
                    They're marked{" "}
                    <Sparkles
                      aria-label="sparkle"
                      className="inline h-3.5 w-3.5 text-accent"
                    />{" "}
                    and counted in your result.
                  </>
                ),
              },
            ]}
          />
        )}
      </AnimatePresence>

      {/* Outcomes are otherwise visual-only; narrate them politely. */}
      <div aria-live="polite" role="status" className="sr-only">
        {toast && <span key={toast.nonce}>{toast.text}</span>}
      </div>
    </div>
  );
}
