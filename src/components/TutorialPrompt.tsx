import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { ModalDialog } from "./ModalDialog";

/**
 * The one-time offer of a game's tutorial, shown the first time a player
 * opens its daily. Taking it or waving it off both mark the flag —
 * including a backdrop tap or Escape — so the question is asked exactly
 * once per game. Afterwards the tutorial is still reachable from the hub's
 * bento tile and from the how-to-play sheet.
 *
 * This replaces the coach sheet's old auto-open: a wall of rules on
 * arrival taught less than one hand-picked puzzle does, and the sheet is
 * still one tap away behind the header's "?".
 */
export function TutorialPrompt({
  enabled,
  gameId,
  gameName,
  loadSeen,
  markSeen,
}: {
  /** False on practice/archive/tutorial screens — daily only. */
  enabled: boolean;
  gameId: string;
  gameName: string;
  loadSeen: () => Promise<boolean>;
  markSeen: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void loadSeen().then((seen) => {
      if (live && !seen) setOpen(true);
    });
    return () => {
      live = false;
    };
    // loadSeen is a module-level function per game — stable by construction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const dismiss = () => {
    setOpen(false);
    void markSeen();
  };

  return (
    <AnimatePresence>
      {open && (
        <ModalDialog labelledBy="tutorial-prompt-title" onClose={dismiss}>
          <div className="flex flex-col gap-4">
            <h2
              id="tutorial-prompt-title"
              className="text-lg font-bold tracking-tight"
            >
              First time with {gameName}?
            </h2>
            <p className="text-sm leading-snug text-ink-soft">
              The tutorial is one small puzzle that introduces the rules a
              step at a time. It takes a minute and counts for nothing.
            </p>
            <Link
              to={`/games/${gameId}/tutorial`}
              data-autofocus
              onClick={() => void markSeen()}
              className="rounded-full bg-accent py-2.5 text-center font-semibold text-surface active:scale-95"
            >
              Play the tutorial
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-sm font-semibold text-ink-soft active:scale-95"
            >
              Skip
            </button>
          </div>
        </ModalDialog>
      )}
    </AnimatePresence>
  );
}
