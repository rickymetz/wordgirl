import { useCallback } from "react";
import { Link } from "react-router-dom";
import { usePolygramGame, type GameMode } from "../state/usePolygramGame";
import { currentLevel } from "../state/reducer";
import { PolygonBoard } from "./PolygonBoard";
import { WordTray } from "./WordTray";
import { RankBar } from "./RankBar";
import { WordsPanel } from "./WordsPanel";
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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8">
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

      <div className="py-3">
        <WordsPanel
          state={state}
          onHint={() => dispatch({ type: "revealHint" })}
        />
      </div>

      <WordTray state={state} onBackspace={() => dispatch({ type: "backspace" })} />

      <div className="flex flex-1 items-center justify-center">
        <PolygonBoard
          state={state}
          onLetter={(letter) => dispatch({ type: "tapLetter", letter })}
          onSubmit={() => dispatch({ type: "submit" })}
        />
      </div>

      <LevelClearOverlay state={state} onAdvance={advance} />
      <DoneOverlay state={state} mode={mode.kind} onNewPuzzle={onNewPuzzle} />
    </div>
  );
}
