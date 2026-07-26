import "@fontsource/rubik-mono-one/latin-400.css";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { formatDateKey, formatDuration, formatShareDate, localDateKey } from "../../../lib/date";
import { SHARE_URL } from "../../../lib/share";
import {
  CircleHelp,
  CornerDownLeft,
  Lightbulb,
  Shapes,
  SkipForward,
  Sparkles,
  Type,
} from "lucide-react";
import { HomeLink } from "../../../components/HomeLink";
import { ShareButton } from "../../../components/ShareButton";
import { HoldButton } from "../../../components/HoldButton";
import { ConfettiOverlay } from "../../../components/ConfettiOverlay";
import { useSolveTransition } from "../../../lib/useSolveTransition";
import { useStorageBroken } from "../../../lib/useStorageBroken";
import { ModalDialog } from "../../../components/ModalDialog";
import { CoachSheet, Key } from "../../../components/CoachSheet";
import { usePolygramGame, type GameMode } from "../state/usePolygramGame";
import {
  loadCoachSeen,
  loadDailyProgress,
  markCoachSeen,
} from "../state/persistence";
import { canSkipLevel, currentLevel, hintTarget, unsolvedWords } from "../state/reducer";
import { PolygonBoard } from "./PolygonBoard";
import { CurrentWord } from "./CurrentWord";
import { FoundWordsBar } from "./FoundWordsBar";
import { Controls } from "./Controls";
import { RankBar } from "./RankBar";
import {
  POLYGON_NAMES,
  polygonBottomGap,
  regularPolygonClipPath,
} from "./polygonPath";

function buildShareText(
  state: { found: string[]; revealed: Record<string, number[]> },
  dateKey: string,
  elapsedMs: number,
): string {
  const hints = Object.values(state.revealed).reduce(
    (n, positions) => n + positions.length,
    0,
  );
  const hintPart = hints > 0 ? ` · 🫣 ${hints}` : " · 🤓 0";
  const date = formatShareDate(dateKey);
  return [
    `🔻 Polygram — ${date}`,
    `${state.found.length} words · ⏱️ ${formatDuration(elapsedMs)}${hintPart}`,
    SHARE_URL,
  ].join("\n");
}

interface Props {
  mode: GameMode;
  onNewPuzzle?: () => void;
  /** Archive: wipe the day's progress and start a fresh run. */
  onReplay?: () => void;
}

export function GameScreen({ mode }: Props) {
  const { state, dispatch, doneElapsedMs, hydratedAsSolved } =
    usePolygramGame(mode);
  const level = currentLevel(state);

  const storageBroken = useStorageBroken();
  const done = state.phase === "done";
  const { showConfetti, showResults } = useSolveTransition(done, hydratedAsSolved);

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

  // The words panel is controlled here so the lightbulb can open it.
  const [wordsOpen, setWordsOpen] = useState(false);

  const advance = useCallback(
    () => dispatch({ type: "advanceLevel" }),
    [dispatch],
  );

  // No popup between levels — a short beat for the last word's score
  // pop, then the board morphs into the next polygon.
  useEffect(() => {
    if (state.phase !== "levelClear") return;
    const timer = setTimeout(advance, 900);
    return () => clearTimeout(timer);
  }, [state.phase, advance]);

  // Practice: offer a jump to the daily only while it's still unsolved.
  const [dailyDone, setDailyDone] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode.kind !== "practice") return;
    void loadDailyProgress(localDateKey()).then((saved) =>
      setDailyDone(saved?.completed ?? false),
    );
  }, [mode.kind]);

  // Daily hints are free to use but marked: the first one warns that the
  // day's score will carry a "used hint" indicator.
  const [hintWarningOpen, setHintWarningOpen] = useState(false);
  const hintUsed = Object.keys(state.revealed).length > 0;
  // Tapping an unsolved word in the list aims the next hint at it.
  const [hintTargetWord, setHintTargetWord] = useState<string | null>(null);
  useEffect(() => {
    setHintTargetWord(null);
  }, [state.levelIndex]);
  // Reveal the first still-hidden letter of the (chosen or default) word.
  const revealNextLetter = () => {
    const chosen =
      hintTargetWord &&
      unsolvedWords(state).includes(hintTargetWord) &&
      (state.revealed[hintTargetWord] ?? []).length < hintTargetWord.length
        ? hintTargetWord
        : undefined;
    const target = chosen ?? hintTarget(state);
    if (!target) return;
    const already = state.revealed[target] ?? [];
    const candidates = [...target]
      .map((_, i) => i)
      .filter((i) => !already.includes(i));
    if (candidates.length === 0) return;
    dispatch({
      type: "revealHint",
      word: target,
      letterIndex: candidates[0],
    });
  };
  const requestHint = () => {
    if (mode.kind !== "practice" && !hintUsed) {
      setHintWarningOpen(true);
    } else {
      revealNextLetter();
    }
  };
  const confirmHint = () => {
    setHintWarningOpen(false);
    revealNextLetter();
  };

  // Display-only permutation of the petal letters; shuffling never
  // touches game state. New letters append so existing tiles stay put.
  const sides = level.size;
  const [order, setOrder] = useState(() =>
    Array.from({ length: sides }, (_, i) => i),
  );
  useEffect(() => {
    setOrder((prev) =>
      prev.length >= sides
        ? prev.slice(0, sides)
        : [
            ...prev,
            ...Array.from(
              { length: sides - prev.length },
              (_, k) => prev.length + k,
            ),
          ],
    );
  }, [sides]);
  const shuffle = useCallback(() => {
    setOrder((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }, []);

  // Physical keyboard support: letters type, Backspace deletes, Enter
  // submits, Escape closes the hint dialog.
  const modalOpen = hintWarningOpen || coachOpen;
  useEffect(() => {
    const letters = new Set(state.puzzle.letters.slice(0, level.size));
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setHintWarningOpen(false);
        setCoachOpen(false);
        return;
      }
      if (modalOpen) return;
      if (e.key === "Enter") {
        // A FOCUSED control keeps native Enter activation — a keyboard
        // user pressing Enter on the Hint button must not also submit.
        const target = e.target as HTMLElement | null;
        if (target?.closest("button, a, input, select, textarea")) return;
        e.preventDefault();
        setWordsOpen(false);
        dispatch({ type: "submit" });
      } else if (e.key === "Backspace") {
        setWordsOpen(false);
        dispatch({ type: "backspace" });
      } else if (letters.has(e.key.toLowerCase())) {
        setWordsOpen(false);
        dispatch({ type: "tapLetter", letter: e.key.toLowerCase() });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.puzzle.letters, level.size, modalOpen, dispatch]);

  // Screen-reader narration for outcomes the UI shows only visually.
  // Keyed so an identical repeated outcome (two invalid words in a
  // row) still mutates the DOM — SRs only announce on change.
  const [announcement, setAnnouncementState] = useState({ text: "", n: 0 });
  const setAnnouncement = (text: string) =>
    setAnnouncementState((prev) => ({ text, n: prev.n + 1 }));
  useEffect(() => {
    const r = state.lastResult;
    if (!r) return;
    const remaining = level.words.filter(
      (w) => !state.found.includes(w),
    ).length;
    const messages: Record<string, string> = {
      correct: `${r.word.toUpperCase()} — ${r.bonus ? "bonus word! " : "correct, "}${r.points} points. ${remaining} words left.`,
      duplicate: "Already found.",
      invalid: "Not in word list.",
      tooShort: `Too short — ${level.size} letter words.`,
      empty: "Tap letters to spell a word.",
    };
    setAnnouncement(messages[r.type] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastResult]);
  useEffect(() => {
    if (state.phase === "done") {
      setAnnouncement("Puzzle complete!");
    } else if (state.phase === "playing" && state.levelIndex > 0) {
      setAnnouncement(
        `${POLYGON_NAMES[level.size]} level — ${level.words.length} ${level.size}-letter words to find.`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.levelIndex, state.phase]);

  return (
    <div
      data-level={level.size}
      className="mx-auto flex w-full max-w-md grow flex-col px-5 pb-6 md:max-w-2xl [@media(max-height:720px)]:pb-3"
    >
      <header className="flex items-center justify-between pt-6 pb-2 [@media(max-height:720px)]:pt-3 [@media(max-height:720px)]:pb-1">
        {mode.kind === "archive" ? (
          <Link
            to="/games/polygram/archive"
            className="text-sm font-semibold text-ink-soft"
          >
            ← Archive
          </Link>
        ) : (
          <HomeLink />
        )}
        <span className="flex items-center gap-2">
          {mode.kind === "practice" && dailyDone === false && (
            <Link
              to="/games/polygram"
              className="text-sm font-semibold text-accent"
            >
              New daily puzzle
            </Link>
          )}
          {!done && (
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
              Hint{hintUsed ? ` (${Object.values(state.revealed).reduce((n, p) => n + p.length, 0)})` : ""}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCoachOpen(true)}
            aria-label="how to play"
            className="relative -m-2 flex h-9 w-9 items-center justify-center rounded-full p-2 text-ink-soft active:scale-90 after:absolute after:-inset-1"
          >
            <CircleHelp aria-hidden className="h-5 w-5" />
          </button>
        </span>
      </header>

      {/* Baseline-aligned: the shape's flat bottom sits on the text
          baseline like a glyph, and the subtitle shares it. */}
      <div className="flex items-baseline gap-2.5 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Polygram</h1>
        {/* Level indicator: the current polygon in the level color —
            morphs with the board on level-up. */}
        <span
          role="img"
          aria-label={`${POLYGON_NAMES[level.size]} level`}
          className="inline-block shrink-0 bg-accent"
          style={{
            width: 22,
            height: 22,
            clipPath: regularPolygonClipPath(level.size),
            // Drop by the box's empty bottom so the shape's VISIBLE
            // bottom sits on the title baseline, not the box's.
            transform: `translateY(${(polygonBottomGap(level.size) * 22).toFixed(1)}px)`,
            transition:
              "clip-path 600ms cubic-bezier(0.65, 0, 0.35, 1), transform 600ms cubic-bezier(0.65, 0, 0.35, 1)",
          }}
        />
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

      <RankBar state={state} />

      <div className="pt-3">
        <FoundWordsBar
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

      <div className="flex flex-1 flex-col items-center justify-center">
        {/* Symmetric breathing room above and below the typed word;
            tightens on short screens so controls stay on-screen. */}
        <div className="py-8 [@media(max-height:720px)]:py-2">
          <CurrentWord state={state} />
        </div>
        {/* Any puzzle input closes an open words panel — the player
            has moved on from browsing to playing. */}
        <PolygonBoard
          state={state}
          order={order}
          onLetter={(letter) => {
            setWordsOpen(false);
            dispatch({ type: "tapLetter", letter });
          }}
          onSubmit={() => {
            setWordsOpen(false);
            dispatch({ type: "submit" });
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {done && showResults ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 pb-2"
          >
            <p className="text-lg font-bold text-ink">Solved</p>
            {doneElapsedMs !== null && (
              <p className="font-game text-2xl text-accent">
                {formatDuration(doneElapsedMs)}
              </p>
            )}
            <p className="text-sm text-ink-soft">
              {state.score} of {state.puzzle.maxScore} points · {POLYGON_NAMES[state.puzzle.maxLevel]} reached
            </p>
            {Object.keys(state.revealed).length > 0 && (
              <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft">
                Used hint
              </span>
            )}
            {mode.kind !== "practice" && mode.dateKey && doneElapsedMs !== null && (
              <ShareButton text={buildShareText(state, mode.dateKey, doneElapsedMs)} gameId="polygram" />
            )}
          </motion.div>
        ) : !done ? (
          <motion.div
            key="controls"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            {canSkipLevel(state) && (
              // Held, not tapped: skipping forfeits the level's
              // remaining words, so a stray thumb must not do it.
              <HoldButton
                onHoldComplete={() => dispatch({ type: "skipLevel" })}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-surface"
              >
                <SkipForward aria-hidden className="h-4 w-4" />
                Hold to skip level
              </HoldButton>
            )}
            <Controls
              onDelete={() => {
                setWordsOpen(false);
                dispatch({ type: "backspace" });
              }}
              onShuffle={() => {
                setWordsOpen(false);
                shuffle();
              }}
              onEnter={() => {
                setWordsOpen(false);
                dispatch({ type: "submit" });
              }}
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
              A letter of an unfound word will be revealed in your word
              list, and today's result will note{" "}
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
            rules={[
              {
                Icon: Type,
                title: "Build words",
                body: (
                  <>
                    Spell <Key>{level.size}-letter words</Key> from the
                    letters around the center — letters <Key>can repeat</Key>.
                  </>
                ),
              },
              {
                Icon: CornerDownLeft,
                title: "Submit at the center",
                body: (
                  <>
                    Tap the <Key>middle shape</Key> (or press Enter). Its
                    number counts the words still hidden.
                  </>
                ),
              },
              {
                Icon: Shapes,
                title: "Clear the level",
                body: (
                  <>
                    Find <Key>every word</Key> and a new letter joins — the
                    shapes become the next polygon.
                  </>
                ),
              },
              {
                Icon: Sparkles,
                title: "Bonus words",
                body: (
                  <>
                    Less common words score{" "}
                    <Key>
                      <span className="text-accent">✦</span> bonus
                    </Key>{" "}
                    points. Find enough and you can{" "}
                    <Key>hold to skip the level</Key> — or keep hunting.
                  </>
                ),
              },
              {
                Icon: Lightbulb,
                title: "Hints",
                body: (
                  <>
                    Open <Key>Your words</Key> to see the level as ?-blanks
                    in ABC order — where a blank sits is itself a clue. The{" "}
                    <Key>Hint</Key> button there reveals a letter (your
                    result will say so).
                  </>
                ),
              },
            ]}
          />
        )}
      </AnimatePresence>

      {/* Outcomes are otherwise visual-only; narrate them politely. */}
      <div aria-live="polite" role="status" className="sr-only">
        <span key={announcement.n}>{announcement.text}</span>
      </div>
    </div>
  );
}
