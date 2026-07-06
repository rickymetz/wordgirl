import "@fontsource/rubik-mono-one/index.css";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePolygramGame, type GameMode } from "../state/usePolygramGame";
import { currentLevel } from "../state/reducer";
import { PolygonBoard } from "./PolygonBoard";
import { CurrentWord } from "./CurrentWord";
import { FoundWordsBar } from "./FoundWordsBar";
import { Controls } from "./Controls";
import { RankBar } from "./RankBar";
import { DoneOverlay, LevelClearOverlay } from "./Overlays";
import { POLYGON_NAMES } from "./polygonPath";

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
        <Link to="/" className="text-sm font-semibold text-ink-soft">
          ← WordGirl
        </Link>
        {mode.kind === "daily" ? (
          <Link
            to="/games/polygram/practice"
            className="text-sm font-semibold text-accent"
          >
            Practice
          </Link>
        ) : (
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

      <div className="pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Polygram</h1>
        <p className="text-sm text-ink-soft">
          {POLYGON_NAMES[level.size]} level — make {level.size}-letter words.
          Letters can repeat.
        </p>
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
    </div>
  );
}
