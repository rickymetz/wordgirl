import "@fontsource/rubik-mono-one/latin-400.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import {
  CircleHelp,
  CornerDownLeft,
  Delete,
  FlipHorizontal2,
  Hourglass,
  Lightbulb,
  Sparkles,
  Target,
  Type,
} from "lucide-react";
import { formatDateKey, formatDuration, formatShareDate, localDateKey } from "../../../lib/date";
import { SHARE_URL } from "../../../lib/share";
import { ShareButton } from "../../../components/ShareButton";
import { DailyOutro } from "../../../components/game/DailyOutro";
import { HomeLink } from "../../../components/HomeLink";
import { trackCoach, trackHint } from "../../../lib/analytics";
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
import { useBackwordsGame, type GameMode } from "../state/useBackwordsGame";
import {
  displayStreak,
  loadDailyProgress,
  loadStats,
  loadTutorialSeen,
  markTutorialSeen,
} from "../state/persistence";

import { glyphRowCount, resolvePlacement } from "../state/reducer";
import { isStraddle } from "../engine/types";
import { GameToast, useToast } from "../../../components/game/GameToast";
import { MirrorBoard } from "./MirrorBoard";
import { LetterBank } from "./LetterBank";
import { dragPoint } from "./dragPoint";

/** The streak `DailyOutro` shows — this game's own, read at the finish. */
const outroStreak = async (today: string) =>
  displayStreak(await loadStats(), today);

function buildShareText(
  rows: number,
  parRows: number,
  dateKey: string,
  elapsedMs: number,
  hints: number,
): string {
  const date = formatShareDate(dateKey);
  const hintPart = hints > 0 ? ` · 🫣 ${hints}` : " · 🤓 0";
  // Rows against par, not a bare word count: everyone empties the rack,
  // so the count alone compared nothing between two players' results.
  const parPart = rows <= parRows ? "⭐️ par" : `par ${parRows}`;
  return [
    `🪞 Backwords — ${date}`,
    `${rows} rows · ${parPart} · ⏱️ ${formatDuration(elapsedMs)}${hintPart}`,
    SHARE_URL,
  ].join("\n");
}

interface Props {
  mode: GameMode;
  onNewPuzzle?: () => void;
  /** Tutorial: replay the script from step one. */
  onRestartTutorial?: () => void;
  /** Archive: wipe the day's progress and start a fresh run. */
  onReplay?: () => void;
}

export function GameScreen({ mode, onRestartTutorial }: Props) {
  const { state, dispatch, puzzle, solvedElapsedMs, hydratedAsSolved } =
    useBackwordsGame(mode);
  const isTutorial = mode.kind === "tutorial";
  const isDaily = mode.kind === "daily";

  const storageBroken = useStorageBroken();
  const { showConfetti, showResults } = useSolveTransition(state.solved, hydratedAsSolved);

  // The tutorial's running instruction. Only ever moves forward.
  const tutorialStep = useTutorialProgress(tutorialStepIndex(state));

  // A tile in flight: the mirror reflects it LIVE — the ghost tracks
  // the drag, mirrored across the glass, so it works from EITHER side
  // of the line. Positioned by writing straight to the DOM: a setState
  // per drag frame re-renders the board mid-drag, and motion's drag
  // measurements drift under it (the tile runs away from the finger
  // on iOS).
  const mirrorRectRef = useRef<DOMRect | null>(null);
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
        mirrorRectRef.current = null;
        return;
      }
      // Measure the mirror once per drag — it can't move while a tile
      // is in flight, and getBoundingClientRect per pointermove forces
      // a layout flush per frame.
      const r = (mirrorRectRef.current ??=
        document.getElementById("bw-mirror")?.getBoundingClientRect() ?? null);
      if (!r) return;
      ghost.style.display = "flex";
      ghost.style.left = `${r.width - (point.x - r.left)}px`;
      ghost.style.top = `${point.y - r.top}px`;
      ghost.textContent = letter;
    },
    [],
  );

  // The staged letters already read as an odd palindrome's half: the
  // middle tile slides onto the glass BEFORE commit, so the straddle
  // is a live preview rather than a surprise. Aliased placements
  // (POO -> POOP) show the canonical placement, extras filling the
  // reflection's slots — typing INTO the mirror. resolvePlacement is
  // the same seam the reducer's commit uses, so preview and commit
  // can never disagree.
  const resolved = resolvePlacement(state.lexicon, state.current);
  const currentStraddle = !!resolved.def && isStraddle(resolved.def);
  const activePlace = resolved.place;

  // Par is exact, so a solve can meet it but never beat it; `<=` is
  // belt and braces against a save from an older, laxer derivation.
  const atPar = state.solved && state.rows.length <= puzzle.parRows;

  // The coach sheet opens on demand only — the first-run introduction is
  // now the tutorial offer (see TutorialPrompt).
  const [coachOpen, setCoachOpen] = useState(false);
  const closeCoach = () => setCoachOpen(false);

  // Practice: offer a jump to the daily only while it's still unsolved.
  const [dailySolved, setDailySolved] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode.kind !== "practice") return;
    void loadDailyProgress(localDateKey()).then((saved) =>
      setDailySolved(saved?.solved ?? false),
    );
  }, [mode.kind]);

  // Physical keyboard: letters stage, Backspace deletes, Enter places.
  const modalOpen = coachOpen;
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

  // Play-by-play for screen readers: staging, deleting, and row edits
  // are otherwise visual-only (there is no focused text field to echo
  // typed letters, and the toast only narrates commit outcomes).
  const [playAnnounce, setPlayAnnounce] = useState("");
  const prevPlayRef = useRef({ current: state.current, rows: state.rows });
  useEffect(() => {
    const prev = prevPlayRef.current;
    prevPlayRef.current = { current: state.current, rows: state.rows };
    if (state.rows.length < prev.rows.length) {
      // Identity, not place: two rows can share a placement string
      // (POP and POOP both place "po").
      const gone = prev.rows.find((r) => !state.rows.includes(r));
      if (gone) {
        setPlayAnnounce(
          `Took back ${gone.place.toUpperCase()}. ${state.bank.length} letters left.`,
        );
      }
      return;
    }
    if (state.current === prev.current) return;
    if (state.current.length > prev.current.length) {
      setPlayAnnounce(
        `${state.current[state.current.length - 1].toUpperCase()} — row is ${state.current.toUpperCase()}.`,
      );
    } else if (state.current.length === 0 && prev.current.length > 1) {
      setPlayAnnounce(`Cleared ${prev.current.toUpperCase()}.`);
    } else if (state.current.length < prev.current.length) {
      setPlayAnnounce(
        state.current
          ? `Deleted. Row is ${state.current.toUpperCase()}.`
          : "Deleted. Row is empty.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.current, state.rows]);

  // Submit feedback: a transient toast over the board, narrated for
  // screen readers via the live region below.
  const { toast, show } = useToast();
  useEffect(() => {
    const r = state.lastResult;
    if (!r) return;
    const messages: Record<string, string> = {
      committed:
        r.type === "committed"
          ? r.row.words.map((w) => w.toUpperCase()).join(" · ") +
            (r.row.glyph ? " — a true mirror" : "")
          : "",
      solved: "Board clear!",
      // Name the reading that fails — the staged word or its mirror —
      // and never call a real (bonus-tier) word invalid.
      invalid:
        r.type === "invalid"
          ? r.reason === "rare"
            ? `${r.badWord.toUpperCase()} is too rare here`
            : `${r.badWord.toUpperCase()} isn't a valid word`
          : "",
      duplicate: "Already placed",
      empty: "Tap letters to build a row",
    };
    show(messages[r.type] ?? "", r.type === "invalid" ? 3000 : 1600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastResult]);

  return (
    <div
      data-level="backwords"
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-6 md:max-w-2xl [@media(max-height:720px)]:pb-3"
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
        <span className="flex items-center gap-2">
          {mode.kind === "practice" && dailySolved === false && (
            <Link
              to="/games/backwords"
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
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                trackHint("backwords");
                dispatch({ type: "revealHint" });
              }}
            >
              <Lightbulb aria-hidden className="h-3.5 w-3.5" />
              Hint{state.hints > 0 ? ` (${state.hints})` : ""}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              trackCoach("backwords");
              setCoachOpen(true);
            }}
            aria-label="how to play"
            className="relative -m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90 after:absolute after:-inset-1"
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
        {isTutorial && (
          <span className="text-base font-semibold text-ink-soft">
            tutorial
          </span>
        )}
      </div>

      {isTutorial && (
        <TutorialBanner steps={TUTORIAL_STEPS} index={tutorialStep} />
      )}

      {storageBroken && !isTutorial && (
        <p className="pb-2 text-xs font-semibold text-warn" role="alert">
          Progress can't be saved on this device.
        </p>
      )}

      {/* The day's target, stated before the first move — it is what
          turns "empty the rack" into "find the long word hiding in it".
          Par is day-scale chrome, so the tutorial's five-letter toy
          board hides it, as it hides hints and rank. */}
      <div role="status" className="text-sm font-medium text-ink-soft">
        {state.solved
          ? "Every letter placed"
          : `${state.bank.length} letters left`}
        {!isTutorial && !state.solved && ` · par ${puzzle.parRows} rows`}
      </div>

      {/* id: the drop target for dragged bank tiles. */}
      <div
        id="bw-board"
        className="relative flex flex-1 flex-col justify-center py-4 [@media(max-height:720px)]:py-2"
      >
        <MirrorBoard
          rows={state.rows}
          current={state.current}
          activePlace={activePlace}
          currentStraddle={currentStraddle}
          solved={state.solved}
          bankAll={puzzle.bank}
          onBreakRow={(index) => dispatch({ type: "breakRow", index })}
          onUnstage={(index) => dispatch({ type: "unstage", index })}
          onDragLive={onDragLive}
          reservedH={isTutorial ? TUTORIAL_BANNER_H : 0}
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
              gameId="backwords"
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
              {atPar ? "Solved at par" : "Solved"}
            </p>
            <p className="text-ink-soft">
              {/* Tutorial solves render TutorialDone instead of this
                  block, so par needs no guard here. */}
              {state.rows.length} {state.rows.length === 1 ? "row" : "rows"}
              {` · par ${puzzle.parRows}`}
            </p>
            {solvedElapsedMs !== null && (
              <p className="font-game text-2xl text-accent">
                {formatDuration(solvedElapsedMs)}
              </p>
            )}
            {/* No par pill: the headline and the subline already say it,
                and a third restatement crowds the ✦ badge out. */}
            {glyphRowCount(state.rows) > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft">
                <Sparkles aria-hidden className="h-3.5 w-3.5 text-accent" />
                {glyphRowCount(state.rows)} true mirror {glyphRowCount(state.rows) === 1 ? "row" : "rows"}
              </span>
            )}
            {(mode.kind === "daily" || mode.kind === "archive") &&
              solvedElapsedMs !== null && (
              <ShareButton
                text={buildShareText(
                  state.rows.length,
                  puzzle.parRows,
                  mode.dateKey,
                  solvedElapsedMs,
                  state.hints,
                )}
                gameId="backwords"
              />
            )}
            {isDaily && (
              <DailyOutro gameId="backwords" loadStreak={outroStreak} />
            )}
          </motion.div>
        ) : !state.solved ? (
          <motion.div
            key="controls"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => dispatch({ type: "clearRow" })}
                className="-my-3.5 touch-manipulation px-3 py-3.5 text-xs font-semibold text-ink-soft"
              >
                Clear row
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => dispatch({ type: "backspace" })}
                aria-label="delete letter"
                className="relative flex h-9 w-11 touch-manipulation items-center justify-center rounded-lg bg-tile text-ink after:absolute after:-inset-1.5 after:content-[''] active:scale-90"
              >
                <Delete aria-hidden className="h-4 w-4" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => dispatch({ type: "commit" })}
                className={`relative touch-manipulation rounded-full px-6 py-2 text-sm font-semibold transition-colors after:absolute after:-inset-1 after:content-[''] active:scale-95 ${
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
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showConfetti && <ConfettiOverlay />}

      <AnimatePresence>
        {coachOpen && (
          <CoachSheet
            onClose={closeCoach}
            tutorialTo={isTutorial ? undefined : "/games/backwords/tutorial"}
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
                    completes the rest. Typing the whole word out works
                    too.
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
                    revealed at the end.
                  </>
                ),
              },
              {
                Icon: Target,
                title: "Play for par",
                body: (
                  <>
                    <Key>Par</Key> is the fewest rows the day can be solved
                    in — always reachable, never beatable. Short pairs
                    clear the rack; the long word hiding in it clears the
                    rack <Key>at par</Key>.
                  </>
                ),
              },
              {
                Icon: Sparkles,
                title: "True mirror rows",
                body: (
                  <>
                    Some rows survive a real mirror, letter for letter —
                    hold MOM or WOW up to one and it still reads. They're
                    marked{" "}
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

      <TutorialPrompt
        enabled={isDaily}
        gameId="backwords"
        gameName="Backwords"
        loadSeen={loadTutorialSeen}
        markSeen={markTutorialSeen}
      />

      {/* Outcomes are otherwise visual-only; narrate them politely. */}
      <div aria-live="polite" role="status" className="sr-only">
        {toast && <span key={toast.nonce}>{toast.text}</span>}
      </div>
      <div aria-live="polite" className="sr-only">
        {playAnnounce}
      </div>
    </div>
  );
}
