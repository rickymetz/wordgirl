import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { trackTutorialFinished } from "../../lib/analytics";

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
  /**
   * Take focus on mount. `data-autofocus` alone does nothing here — only
   * useModalFocus reads that attribute, and a results block is not a
   * dialog — so focus stayed on <body> at the finish and a keyboard or
   * screen-reader player was never told the tutorial had ended. The
   * attribute stays as the house marker for "the intended initial focus".
   * preventScroll, because the card is already in view and scrolling to it
   * would shift a page that is meant not to scroll at all.
   */
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
    // This card IS the end of the script — it only renders once the board
    // is solved — so its mount is the one honest place to count a finish.
    trackTutorialFinished(gameId);
  }, [gameId]);

  return (
    <div
      ref={cardRef}
      className="flex flex-col items-center gap-3 pb-2 outline-none"
      data-autofocus
      tabIndex={-1}
      // The name the focus move announces. An sr-only live region saying
      // the same words would land on top of this and read the headline
      // twice — moving focus to a NAMED container is the announcement.
      aria-labelledby="tutorial-done-title"
    >
      <h2 id="tutorial-done-title" className="text-lg font-bold text-ink">
        Tutorial complete
      </h2>
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
