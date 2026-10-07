import { useCallback, useEffect, useRef, type Dispatch } from "react";
import { isModalOpen, onModalOpenChange } from "../modalOpen";

/**
 * The active-time clock every daily game runs. It counts only time the
 * player could be PLAYING:
 *
 * - it starts at the player's first input this session (`input()`), not
 *   at mount — the first-visit tutorial offer, storage hydration and
 *   reading the board before the first move are free;
 * - it pauses while the tab is hidden (visibilitychange) AND while any
 *   modal dialog/sheet is open (`lib/modalOpen.ts`, counted by
 *   `useModalFocus`): the "?" sheet, a hint confirmation, Settings;
 * - it freezes at the solve AT THE WINNING INPUT: every `input()` stamps
 *   the elapsed time at that moment, and `freeze()` takes the latest
 *   stamp, so the solved render's passive effect (a frame or more after
 *   the tap, plus any between-level animation) never adds to it.
 *
 * It FLUSHES a save whenever the app hides (iOS routinely kills
 * suspended PWAs), and resumes from a hydrated save's elapsed time —
 * again from that session's first input.
 *
 * The owning hook calls hydrate() when a save loads, routes the
 * player's actions through `useClockedDispatch` (which calls input()),
 * freeze() once the board completes, and reads currentElapsedMs() when
 * persisting. `flush` is called on hide/pagehide/unmount — point it at
 * persistNow (which owns its own gating).
 */
export function useDailyClock({
  flush,
  resetKey,
}: {
  flush: () => void;
  /** Re-arms the lifecycle listeners when the session identity
   * changes (dateKey / difficulty). */
  resetKey?: string;
}) {
  const savedElapsedRef = useRef(0);
  // This session's active time: closed segments, plus the open one.
  const bankedMsRef = useRef(0);
  const runningSinceRef = useRef<number | null>(null);
  // Set by the first input; until then no time accrues at all.
  const startedRef = useRef(false);
  // Elapsed time as of the latest input — what a solve freezes at.
  const stampRef = useRef<number | null>(null);
  const frozenRef = useRef<number | null>(null);
  const alreadySolvedRef = useRef(false);

  const elapsedAt = (now: number) =>
    savedElapsedRef.current +
    bankedMsRef.current +
    (runningSinceRef.current === null ? 0 : now - runningSinceRef.current);

  /** Open or close the running segment to match the pause conditions. */
  const sync = (now: number) => {
    const shouldRun =
      startedRef.current && !document.hidden && !isModalOpen();
    if (!shouldRun && runningSinceRef.current !== null) {
      bankedMsRef.current += now - runningSinceRef.current;
      runningSinceRef.current = null;
    } else if (shouldRun && runningSinceRef.current === null) {
      runningSinceRef.current = now;
    }
  };

  /** Live elapsed time (ignores any freeze). */
  const rawElapsedMs = () => elapsedAt(Date.now());

  const currentElapsedMs = () => {
    // A day solved BEFORE this session keeps its saved time verbatim.
    if (alreadySolvedRef.current) return savedElapsedRef.current;
    if (frozenRef.current !== null) return frozenRef.current;
    return rawElapsedMs();
  };

  /**
   * A player input happened at `at` (default: now — call it from the
   * input's own handler): starts the clock on the first one, and stamps
   * the elapsed time as of this input for freeze()/stampedElapsedMs().
   * Stable identity; reads only refs.
   */
  const input = useCallback((at: number = Date.now()) => {
    startedRef.current = true;
    sync(at);
    stampRef.current = elapsedAt(at);
  }, []);

  /** Elapsed time as of the latest input (live time if none yet) — the
   * re-stamp for a word banked past the solve threshold. */
  const stampedElapsedMs = () => stampRef.current ?? rawElapsedMs();

  /** A save hydrated: resume its clock (frozen if it was solved). The
   * session's own time restarts at the next input. */
  const hydrate = (savedElapsedMs: number, alreadySolved: boolean) => {
    savedElapsedRef.current = savedElapsedMs;
    alreadySolvedRef.current = alreadySolved;
    bankedMsRef.current = 0;
    runningSinceRef.current = null;
    startedRef.current = false;
    stampRef.current = null;
  };

  /** Stop the clock at the solve — at the latest input's stamp, so the
   * winning tap, not this call, is the finish. Idempotent. */
  const freeze = (): number => {
    if (alreadySolvedRef.current) return savedElapsedRef.current;
    frozenRef.current ??= stampedElapsedMs();
    return frozenRef.current;
  };

  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    sync(Date.now());
    const onVisibility = () => {
      sync(Date.now());
      if (document.hidden) flushRef.current();
    };
    const onPageHide = () => flushRef.current();
    const offModal = onModalOpenChange(() => sync(Date.now()));
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      offModal();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flushRef.current();
    };
  }, [resetKey]);

  return {
    rawElapsedMs,
    currentElapsedMs,
    stampedElapsedMs,
    input,
    hydrate,
    freeze,
  };
}

/**
 * Wraps a game reducer's dispatch so every PLAYER action starts/stamps
 * the clock at the moment it is dispatched — inside the input's handler.
 * `programmatic` lists the action types the game dispatches itself
 * (hydration, timers), which must never start the clock.
 */
export function useClockedDispatch<A extends { type: string }>(
  dispatch: Dispatch<A>,
  input: (at?: number) => void,
  programmatic: readonly string[] = ["hydrate"],
): Dispatch<A> {
  const programmaticRef = useRef(programmatic);
  programmaticRef.current = programmatic;
  return useCallback(
    (action: A) => {
      if (!programmaticRef.current.includes(action.type)) input();
      dispatch(action);
    },
    [dispatch, input],
  );
}
