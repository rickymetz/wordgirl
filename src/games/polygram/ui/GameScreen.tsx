import "@fontsource/rubik-mono-one/latin-400.css";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDateKey, localDateKey } from "../../../lib/date";
import { HomeLink } from "../../../components/HomeLink";
import { usePolygramGame, type GameMode } from "../state/usePolygramGame";
import {
  loadCoachSeen,
  loadDailyProgress,
  markCoachSeen,
} from "../state/persistence";
import { currentLevel, hintTarget, unsolvedWords } from "../state/reducer";
import { PolygonBoard } from "./PolygonBoard";
import { CurrentWord } from "./CurrentWord";
import { FoundWordsBar } from "./FoundWordsBar";
import { Controls } from "./Controls";
import { RankBar } from "./RankBar";
import { DoneOverlay } from "./Overlays";
import {
  POLYGON_NAMES,
  polygonBottomGap,
  regularPolygonClipPath,
} from "./polygonPath";

interface Props {
  mode: GameMode;
  onNewPuzzle?: () => void;
  /** Archive: wipe the day's progress and start a fresh run. */
  onReplay?: () => void;
}

export function GameScreen({ mode, onNewPuzzle, onReplay }: Props) {
  const { state, dispatch, doneElapsedMs } = usePolygramGame(mode);
  const level = currentLevel(state);

  // Warn (once) if this device can't persist progress.
  const [storageBroken, setStorageBroken] = useState(false);
  useEffect(() => {
    const onError = () => setStorageBroken(true);
    window.addEventListener("wg:storage-error", onError);
    return () => window.removeEventListener("wg:storage-error", onError);
  }, []);

  // Completion card is dismissable — closing reveals the solved board.
  const [resultsOpen, setResultsOpen] = useState(true);

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

  // After a few consecutive misses, glow the lightbulb — the stuck
  // player is exactly who needs to discover hints.
  const [missStreak, setMissStreak] = useState(0);
  useEffect(() => {
    const t = state.lastResult?.type;
    if (!t) return;
    setMissStreak((n) =>
      t === "invalid" || t === "duplicate" ? n + 1 : t === "correct" ? 0 : n,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastResult]);

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
  // Reveal a RANDOM still-hidden letter of the (chosen or default) word.
  const revealRandomLetter = () => {
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
  const modalOpen =
    hintWarningOpen || coachOpen || (state.phase === "done" && resultsOpen);
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
        dispatch({ type: "submit" });
      } else if (e.key === "Backspace") {
        dispatch({ type: "backspace" });
      } else if (letters.has(e.key.toLowerCase())) {
        dispatch({ type: "tapLetter", letter: e.key.toLowerCase() });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.puzzle.letters, level.size, modalOpen, dispatch]);

  // Screen-reader narration for outcomes the UI shows only visually.
  const [announcement, setAnnouncement] = useState("");
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
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 [@media(max-height:720px)]:pb-4"
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
        <span className="flex items-center gap-3">
          {mode.kind === "practice" && dailyDone === false && (
            <Link
              to="/games/polygram"
              className="text-sm font-semibold text-accent"
            >
              New daily puzzle
            </Link>
          )}
          {state.phase === "done" && !resultsOpen && (
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
        <PolygonBoard
          state={state}
          order={order}
          onLetter={(letter) => dispatch({ type: "tapLetter", letter })}
          onSubmit={() => dispatch({ type: "submit" })}
        />
        <Controls
          onDelete={() => dispatch({ type: "backspace" })}
          onShuffle={shuffle}
          onEnter={() => dispatch({ type: "submit" })}
          onHint={() => {
            setWordsOpen(true);
            setMissStreak(0);
          }}
          hintNudge={missStreak >= 3}
        />
      </div>

      <DoneOverlay
        state={state}
        mode={mode.kind}
        dateKey={mode.kind === "practice" ? undefined : mode.dateKey}
        elapsedMs={doneElapsedMs}
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        onNewPuzzle={onNewPuzzle}
        onReplay={onReplay}
      />

      {hintWarningOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface/80 px-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hint-dialog-title"
            className="w-full max-w-sm rounded-3xl border border-line bg-surface-raised p-6 text-center shadow-xl"
          >
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
                autoFocus
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
        </div>
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
                  Spell {level.size}-letter words
                </span>{" "}
                from the letters around the center — letters{" "}
                <span className="font-semibold text-ink">can repeat</span>.
              </li>
              <li>
                Tap letters (or type), then tap the{" "}
                <span className="font-semibold text-ink">center shape</span>{" "}
                or Enter to submit. The number is how many words are left.
              </li>
              <li>
                Find them <span className="font-semibold text-ink">all</span>{" "}
                and a new letter joins — the shapes grow into the next
                polygon.
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
        {announcement}
      </div>
    </div>
  );
}
