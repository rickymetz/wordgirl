import "@fontsource/rubik-mono-one/index.css";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDateKey, localDateKey } from "../../../lib/date";
import { HomeLink } from "../../../components/HomeLink";
import { usePolygramGame, type GameMode } from "../state/usePolygramGame";
import { currentLevel, hintTarget } from "../state/reducer";
import { PolygonBoard } from "./PolygonBoard";
import { CurrentWord } from "./CurrentWord";
import { FoundWordsBar } from "./FoundWordsBar";
import { Controls } from "./Controls";
import { RankBar } from "./RankBar";
import { DoneOverlay } from "./Overlays";
import { POLYGON_NAMES, regularPolygonClipPath } from "./polygonPath";

interface Props {
  mode: GameMode;
  onNewPuzzle?: () => void;
  /** Archive: wipe the day's progress and start a fresh run. */
  onReplay?: () => void;
}

export function GameScreen({ mode, onNewPuzzle, onReplay }: Props) {
  const { state, dispatch } = usePolygramGame(mode);
  const level = currentLevel(state);

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

  // Daily hints are free to use but marked: the first one warns that the
  // day's score will carry a "used hint" indicator.
  const [hintWarningOpen, setHintWarningOpen] = useState(false);
  const hintUsed = Object.keys(state.revealed).length > 0;
  // Reveal a RANDOM still-hidden letter of the hint target word.
  const revealRandomLetter = () => {
    const target = hintTarget(state);
    if (!target) return;
    const already = state.revealed[target] ?? [];
    const candidates = [...target]
      .map((_, i) => i)
      .filter((i) => !already.includes(i));
    if (candidates.length === 0) return;
    dispatch({
      type: "revealHint",
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

  return (
    <div
      data-level={level.size}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8"
    >
      <header className="flex items-center justify-between pt-6 pb-2">
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
        {mode.kind === "practice" && (
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNewPuzzle}
              className="text-sm font-semibold text-accent"
            >
              New puzzle
            </button>
            <Link
              to="/games/polygram"
              className="text-sm font-semibold text-ink-soft"
            >
              Daily
            </Link>
          </span>
        )}
      </header>

      <div className="flex items-center gap-2.5 pb-3">
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
            transition: "clip-path 600ms cubic-bezier(0.65, 0, 0.35, 1)",
          }}
        />
        {mode.kind === "archive" && (
          <span className="text-base font-semibold text-ink-soft">
            {formatDateKey(mode.dateKey)}
          </span>
        )}
      </div>

      <RankBar state={state} />

      <div className="pt-3">
        <FoundWordsBar state={state} onHint={requestHint} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {/* Symmetric breathing room above and below the typed word. */}
        <div className="py-8">
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
        />
      </div>

      <DoneOverlay
        state={state}
        mode={mode.kind}
        dateKey={
          mode.kind === "archive"
            ? mode.dateKey
            : mode.kind === "daily"
              ? localDateKey()
              : undefined
        }
        onNewPuzzle={onNewPuzzle}
        onReplay={onReplay}
      />

      {hintWarningOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface/80 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-line bg-surface-raised p-6 text-center shadow-xl">
            <h2 className="text-lg font-bold">Use a hint?</h2>
            <p className="mt-2 text-sm text-ink-soft">
              A letter of an unfound word will be revealed in your word
              list — and today's score will show a{" "}
              <span className="font-semibold text-ink">used hint</span>{" "}
              indicator on the scoreboard.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
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
    </div>
  );
}
