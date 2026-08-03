import { useEffect, useState, type ReactElement } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  trackArchivePlay,
  trackPractice,
  trackReplay,
  trackTutorialStarted,
} from "../../lib/analytics";
import { localDateKey } from "../../lib/date";

/**
 * The three route shells every game repeats: practice, archive replay,
 * and tutorial.
 *
 * These were five copies apiece — code-identical across the three
 * single-board games, and differing in the other two only where a
 * `difficulty` rides along. The house rule says a second copy is an
 * extraction, and by the time #88 needed one analytics line in each of
 * them it was fifteen files for one idea. They are also fifteen places
 * to forget an error path, which is how the archive and stats loaders
 * ended up without one.
 *
 * The shape is the one `GameArchive` and `GameTrends` already use: the
 * game passes what only it can know (its own `GameScreen`, its epoch,
 * its reset), and the shell owns the routing, the remount keys, and the
 * counting.
 */

/**
 * A game's practice route: a random seed, remounted for each new puzzle.
 *
 * `renderScreen` takes the seed rather than the shell rendering
 * `GameScreen` itself, because two of the five also carry a difficulty
 * and pass extra props alongside it.
 */
export function PracticeShell({
  gameId,
  makeSeed,
  resetKey,
  renderScreen,
}: {
  gameId: string;
  makeSeed: () => string;
  /**
   * Changing this draws a fresh seed. Two of the five games let a player
   * switch difficulty mid-practice, which must hand them a new board of
   * the new size rather than leave the old one up.
   */
  resetKey?: string;
  renderScreen: (seed: string, newPuzzle: () => void) => ReactElement;
}) {
  useEffect(() => {
    trackPractice(gameId);
  }, [gameId]);
  const [seed, setSeed] = useState(makeSeed);
  // Adjusting state during render on a changed prop — React's documented
  // alternative to an effect, and the right one here: an effect would
  // paint the old board for a frame before replacing it.
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setSeed(makeSeed());
  }
  // The seed keys the screen, so a new one remounts it for a fresh board.
  return renderScreen(seed, () => setSeed(makeSeed()));
}

/**
 * A game's archive replay route: /games/<id>/archive/:dateKey.
 *
 * Rejects a dateKey that is malformed, before the game existed, or
 * today or later — today's puzzle is the daily, not an archive entry.
 */
export function ArchivePlayShell({
  gameId,
  epoch,
  resetForReplay,
  renderScreen,
}: {
  gameId: string;
  epoch: string;
  /**
   * Wipe the day's progress for a replay; stats stay counted. Optional
   * because Doublet has no replay — `renderScreen` then receives
   * `undefined`, which is exactly what its `onReplay` was already.
   */
  resetForReplay?: (dateKey: string) => Promise<void>;
  renderScreen: (
    dateKey: string,
    runId: number,
    replay: (() => Promise<void>) | undefined,
  ) => ReactElement;
}) {
  useEffect(() => {
    trackArchivePlay(gameId);
  }, [gameId]);
  const { dateKey } = useParams();
  const [runId, setRunId] = useState(0);
  const valid =
    dateKey !== undefined &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateKey) &&
    dateKey >= epoch &&
    dateKey < localDateKey();

  if (!valid) return <Navigate to={`/games/${gameId}/archive`} replace />;
  const reset = resetForReplay;
  return renderScreen(
    dateKey,
    runId,
    reset &&
      (async () => {
        trackReplay(gameId);
        await reset(dateKey);
        setRunId((n) => n + 1);
      }),
  );
}

/**
 * A game's tutorial route.
 *
 * Nothing here is persisted — arriving is all it takes to mark the offer
 * answered, so a player who bails halfway is not asked again. `runId`
 * remounts the board for "Run it again", the same idiom the archive
 * replay uses.
 */
export function TutorialShell({
  gameId,
  markSeen,
  renderScreen,
}: {
  gameId: string;
  markSeen: () => Promise<void>;
  renderScreen: (runId: number, restart: () => void) => ReactElement;
}) {
  useEffect(() => {
    void markSeen();
    // Every route in lands here — the first-visit prompt, the hub bento
    // tile, and the coach sheet's link — so this counts them all.
    trackTutorialStarted(gameId);
    // markSeen closes over a module import only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);
  const [runId, setRunId] = useState(0);
  return renderScreen(runId, () => setRunId((n) => n + 1));
}
