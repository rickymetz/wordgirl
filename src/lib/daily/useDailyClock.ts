import { useEffect, useRef } from "react";

/**
 * The active-time clock every daily game runs: counts only foreground
 * time (pauses on visibilitychange), FLUSHES a save whenever the app
 * hides (iOS routinely kills suspended PWAs), freezes at the solve,
 * and resumes from a hydrated save's elapsed time.
 *
 * The owning hook calls hydrate() when a save loads, freeze() the
 * moment the board completes, and reads currentElapsedMs() when
 * persisting. `flush` is called on hide/pagehide/unmount — point it
 * at persistNow (which owns its own gating).
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
  const sessionStartRef = useRef(Date.now());
  const sessionActiveMsRef = useRef(0);
  const frozenRef = useRef<number | null>(null);
  const alreadySolvedRef = useRef(false);

  const rawElapsedMs = () =>
    savedElapsedRef.current +
    sessionActiveMsRef.current +
    (document.hidden ? 0 : Date.now() - sessionStartRef.current);

  const currentElapsedMs = () => {
    // A day solved BEFORE this session keeps its saved time verbatim.
    if (alreadySolvedRef.current) return savedElapsedRef.current;
    if (frozenRef.current !== null) return frozenRef.current;
    return rawElapsedMs();
  };

  /** A save hydrated: resume its clock (frozen if it was solved). */
  const hydrate = (savedElapsedMs: number, alreadySolved: boolean) => {
    savedElapsedRef.current = savedElapsedMs;
    alreadySolvedRef.current = alreadySolved;
    sessionStartRef.current = Date.now();
    sessionActiveMsRef.current = 0;
  };

  /** Stop the clock at the solve — idempotent, returns the time. */
  const freeze = (): number => {
    if (alreadySolvedRef.current) return savedElapsedRef.current;
    frozenRef.current ??= rawElapsedMs();
    return frozenRef.current;
  };

  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    const bank = () => {
      sessionActiveMsRef.current += Date.now() - sessionStartRef.current;
      sessionStartRef.current = Date.now();
    };
    const onVisibility = () => {
      if (document.hidden) {
        bank();
        flushRef.current();
      } else {
        sessionStartRef.current = Date.now();
      }
    };
    const onPageHide = () => {
      if (!document.hidden) bank();
      flushRef.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (!document.hidden) bank();
      flushRef.current();
    };
  }, [resetKey]);

  return { rawElapsedMs, currentElapsedMs, hydrate, freeze };
}
