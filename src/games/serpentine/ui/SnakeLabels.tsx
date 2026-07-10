import type { SnakeProgress } from "../state/reducer";
import type { PuzzleDef } from "../engine/types";

interface Props {
  puzzle: PuzzleDef;
  paths: SnakeProgress[];
  activeSnake: number;
  solved: boolean;
  onSwitchSnake: (index: number) => void;
}

export function SnakeLabels({
  puzzle,
  paths,
  activeSnake,
  solved,
  onSwitchSnake,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {puzzle.snakes.map((snake, i) => {
        const progress = paths[i];
        const isActive = i === activeSnake;
        const matched = progress.matchedSnake >= 0;
        const count = progress.cells.length;
        const target = snake.cells.length;

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSwitchSnake(i)}
            onPointerDown={(e) => e.preventDefault()}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors touch-manipulation ${
              isActive
                ? "bg-accent/15 ring-2 ring-accent"
                : "bg-surface-tint"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                matched
                  ? "bg-good text-surface"
                  : isActive
                    ? "bg-accent text-surface"
                    : "bg-tile text-ink-soft"
              }`}
            >
              {i + 1}
            </span>
            <span className="flex grow flex-col">
              {matched || solved ? (
                <span className="text-sm font-semibold text-ink">
                  {snake.text}
                </span>
              ) : (
                <span className="text-sm font-medium text-ink-soft">
                  {count} / {target} letters
                </span>
              )}
            </span>
            {matched && (
              <span className="text-xs font-semibold text-good">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
