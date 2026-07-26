import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * The tutorial's finish card, standing in for a game's usual results
 * block: no time, no score, no share (a hand-picked practice puzzle is
 * nobody's result). Just confirmation and the way on to the real game.
 */
export function TutorialDone({
  gameId,
  recap,
  onRestart,
}: {
  gameId: string;
  /** One line naming what was just learned, in the game's own terms. */
  recap: ReactNode;
  /** Replays the tutorial from step one (the page remounts the board). */
  onRestart?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 pb-2"
      data-autofocus
      tabIndex={-1}
    >
      <p className="text-lg font-bold text-ink">Tutorial complete</p>
      <p className="max-w-xs text-center text-sm leading-snug text-ink-soft">
        {recap}
      </p>
      <Link
        to={`/games/${gameId}`}
        className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-surface active:scale-95"
      >
        Play today's puzzle
      </Link>
      {onRestart && (
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={onRestart}
          className="relative text-sm font-semibold text-ink-soft after:absolute after:inset-x-0 after:-inset-y-3"
        >
          Run it again
        </button>
      )}
    </div>
  );
}
