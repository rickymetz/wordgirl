import "@fontsource/rubik-mono-one/index.css";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDateKey } from "../../../lib/date";
import { usePolygramGame, type GameMode } from "../state/usePolygramGame";
import { currentLevel } from "../state/reducer";
import { PolygonBoard } from "./PolygonBoard";
import { CurrentWord } from "./CurrentWord";
import { FoundWordsBar } from "./FoundWordsBar";
import { Controls } from "./Controls";
import { RankBar } from "./RankBar";
import { DoneOverlay, LevelClearOverlay } from "./Overlays";
import { POLYGON_NAMES, regularPolygonClipPath } from "./polygonPath";

interface Props {
  mode: GameMode;
  onNewPuzzle?: () => void;
}

export function GameScreen({ mode, onNewPuzzle }: Props) {
  const { state, dispatch } = usePolygramGame(mode);
  const level = currentLevel(state);

  const advance = useCallback(
    () => dispatch({ type: "advanceLevel" }),
    [dispatch],
  );

  // Daily hints are free to use but marked: the first one warns that the
  // day's score will carry a "used hint" indicator.
  const [hintWarningOpen, setHintWarningOpen] = useState(false);
  const hintUsed = Object.keys(state.revealed).length > 0;
  const requestHint = () => {
    if (mode.kind !== "practice" && !hintUsed) {
      setHintWarningOpen(true);
    } else {
      dispatch({ type: "revealHint" });
    }
  };
  const confirmHint = () => {
    setHintWarningOpen(false);
    dispatch({ type: "revealHint" });
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
          <Link to="/" className="text-sm font-semibold text-ink-soft">
            ← WordGirl
          </Link>
        )}
        {mode.kind !== "practice" ? (
          <button
            type="button"
            onClick={requestHint}
            className="text-sm font-semibold text-accent"
          >
            Hint
          </button>
        ) : (
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={requestHint}
              className="text-sm font-semibold text-accent"
            >
              Hint
            </button>
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
        <h1 className="text-2xl font-bold tracking-tight">
          Polygram
          {mode.kind === "archive" && (
            <span className="ml-2 text-base font-semibold text-ink-soft">
              {formatDateKey(mode.dateKey)}
            </span>
          )}
        </h1>
        {/* Level indicator: the current polygon in the level color —
            morphs with the board on level-up. */}
        <span
          role="img"
          aria-label={`${POLYGON_NAMES[level.size]} level`}
          className="inline-block bg-accent"
          style={{
            width: 22,
            height: 22,
            clipPath: regularPolygonClipPath(level.size),
            transition: "clip-path 600ms cubic-bezier(0.65, 0, 0.35, 1)",
          }}
        />
      </div>

      <RankBar score={state.score} puzzle={state.puzzle} />

      <div className="pt-3">
        <FoundWordsBar state={state} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-1">
        <CurrentWord state={state} />
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

      <LevelClearOverlay state={state} onAdvance={advance} />
      <DoneOverlay state={state} mode={mode.kind} onNewPuzzle={onNewPuzzle} />

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
